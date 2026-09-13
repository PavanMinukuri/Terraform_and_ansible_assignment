###############################################################################
# TravelMemory – Terraform Outputs
###############################################################################

output "web_server_public_ip" {
  description = "Public IP address of the web/app server EC2 instance"
  value       = aws_instance.web.public_ip
}

output "web_server_public_dns" {
  description = "Public DNS name of the web/app server"
  value       = aws_instance.web.public_dns
}

output "db_server_private_ip" {
  description = "Private IP address of the database server EC2 instance"
  value       = aws_instance.db.private_ip
}

output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "ID of the private subnet"
  value       = aws_subnet.private.id
}

output "nat_gateway_ip" {
  description = "Elastic IP of the NAT Gateway"
  value       = aws_eip.nat.public_ip
}

output "web_security_group_id" {
  description = "ID of the web server security group"
  value       = aws_security_group.web.id
}

output "db_security_group_id" {
  description = "ID of the database security group"
  value       = aws_security_group.db.id
}

# Convenience: ready-made SSH commands
output "ssh_web_server" {
  description = "SSH command to connect to the web server"
  value       = "ssh -i ~/.ssh/id_rsa ec2-user@${aws_instance.web.public_ip}"
}

output "ssh_db_server_via_bastion" {
  description = "SSH command to connect to the DB server via the web server as bastion"
  value       = "ssh -J ec2-user@${aws_instance.web.public_ip} ec2-user@${aws_instance.db.private_ip}"
}
