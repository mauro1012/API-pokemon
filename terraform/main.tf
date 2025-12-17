provider "aws" {
  region = var.aws_region
}

# VPC por defecto
data "aws_vpc" "default" {
  default = true
}

# Subredes públicas
data "aws_subnets" "public_subnets" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "map-public-ip-on-launch"
    values = ["true"]
  }
}

# Security Group
resource "aws_security_group" "web_sg" {
  name   = "web-access-sg"
  vpc_id = data.aws_vpc.default.id

  ingress {
    description = "HTTP Frontend"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Backend interno"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# User Data
locals {
  user_data = <<-EOT
    #!/bin/bash
    yum update -y
    amazon-linux-extras install docker -y
    service docker start
    usermod -a -G docker ec2-user

    docker run -d --name backend -p 3000:3000 ${var.backend_image}
    docker run -d --name frontend -p 80:80 ${var.frontend_image}
  EOT
}

# AMI Amazon Linux 2
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Launch Template
resource "aws_launch_template" "web_lt" {
  name_prefix   = "web-app-lt"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  key_name      = "vockey"

  vpc_security_group_ids = [aws_security_group.web_sg.id]
  user_data              = base64encode(local.user_data)
}

# Auto Scaling Group
resource "aws_autoscaling_group" "web_asg" {
  name                = "web-app-asg"
  vpc_zone_identifier = data.aws_subnets.public_subnets.ids

  min_size         = 2
  max_size         = 4
  desired_capacity = 2

  launch_template {
    id      = aws_launch_template.web_lt.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "web-app-instance"
    propagate_at_launch = true
  }
}

# ALB
resource "aws_lb" "web_lb" {
  name               = "web-app-lb"
  load_balancer_type = "application"
  internal           = false

  security_groups = [aws_security_group.web_sg.id]
  subnets         = data.aws_subnets.public_subnets.ids
}

# Target Group
resource "aws_lb_target_group" "web_tg" {
  name     = "web-app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = data.aws_vpc.default.id

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

# Listener
resource "aws_lb_listener" "web_listener" {
  load_balancer_arn = aws_lb.web_lb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_tg.arn
  }
}

# ASG attachment
resource "aws_autoscaling_attachment" "asg_attachment" {
  autoscaling_group_name = aws_autoscaling_group.web_asg.id
  lb_target_group_arn    = aws_lb_target_group.web_tg.arn
}
