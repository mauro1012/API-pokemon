variable "aws_region" {
  description = "Región de AWS"
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Tipo de instancia EC2"
  default     = "t3.micro"
}

variable "frontend_image" {
  description = "Imagen Docker del frontend"
  type        = string
}

variable "backend_image" {
  description = "Imagen Docker del backend"
  type        = string
}
