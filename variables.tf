###############################################################################
# TravelMemory – Terraform Variables
###############################################################################

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment label"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Short project name used as a prefix for all resources"
  type        = string
  default     = "travelmemory"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for the private subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "operator_ip_cidr" {
  description = "Your public IP in CIDR notation (e.g. 203.0.113.5/32). SSH access is restricted to this."
  type        = string
  # No default – must be supplied in terraform.tfvars to avoid open SSH access
}

variable "public_key_path" {
  description = "Absolute path to the SSH public key file that will be registered as the EC2 key pair"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "web_instance_type" {
  description = "EC2 instance type for the web/app server"
  type        = string
  default     = "t3.small"
}

variable "db_instance_type" {
  description = "EC2 instance type for the database server"
  type        = string
  default     = "t3.small"
}
