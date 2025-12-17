output "alb_dns_name" {
  description = "DNS del Application Load Balancer"
  value       = aws_lb.web_lb.dns_name
}
