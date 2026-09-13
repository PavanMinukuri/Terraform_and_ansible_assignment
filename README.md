# Terraform_and_ansible_assignment

# TravelMemory MERN Stack Deployment on AWS
## Infrastructure Automation with Terraform & Ansible

### 1. Project Overview
This report documents the end-to-end deployment of the TravelMemory MERN (MongoDB, Express, React, Node.js) application on Amazon Web Services (AWS). Infrastructure was provisioned using Terraform (Infrastructure-as-Code) and application configuration was automated using Ansible (Configuration Management).

The TravelMemory application is a travel journaling platform that allows users to record and browse travel memories. The architecture separates concerns across a public-facing web/app server and a privately isolated database server.

##  Technology Stack

###  Frontend
- **React.js**
- Built using **Vite**
- Production build served through **Nginx**

###  Backend
- **Node.js + Express**
- **Node.js 20 LTS**
- Process management using **PM2**
- REST APIs exposed through Express

###  Database
- **MongoDB 7.0**
- Authentication enabled
- Deployed in a **private subnet**

###  Infrastructure
- **AWS**
- Infrastructure provisioned using **Terraform**
- Components include:
  - VPC
  - EC2
  - Internet Gateway (IGW)
  - NAT Gateway
  - IAM
  - Security Groups

###  Configuration Management
- **Ansible**
- Ansible Playbooks
- Reusable **Roles**
- **Jinja2 Templates** for configuration


## 2. Part 1 – Infrastructure with Terraform

### 2.1 Prerequisites

Before deploying the infrastructure, make sure the following are installed and configured:

#### AWS CLI

Install and configure the AWS CLI:

```bash
aws configure
````

Enter the following when prompted:

* AWS Access Key
* AWS Secret Access Key
* AWS Region
* Output Format

#### Terraform

* Terraform version **1.6.0 or later**

Verify the installation:

```bash
terraform --version
```

#### SSH Key Pair

Generate an SSH key pair if you don't already have one:

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa
```

---

### 2.2 Project Structure

The Terraform configuration is organized as follows:

```text
terraform/
├── main.tf              # AWS resources
├── variables.tf         # Input variable declarations
├── outputs.tf           # Terraform outputs
└── terraform.tfvars     # Actual configuration values (gitignored)
```

---

### 2.3 Key Resources Created

####  VPC and Networking

Terraform provisions the following AWS networking resources:

* **VPC**

  * CIDR: `10.0.0.0/16`
  * DNS hostnames enabled

* **Public Subnet**

  * CIDR: `10.0.1.0/24`
  * Availability Zone: `us-east-1a`
  * Auto-assign public IP enabled

* **Private Subnet**

  * CIDR: `10.0.2.0/24`
  * Availability Zone: `us-east-1a`
  * Public IP assignment disabled

* **Internet Gateway (IGW)**

  * Attached to the VPC
  * Provides internet access to the public subnet

* **NAT Gateway**

  * Deployed in the public subnet
  * Uses an Elastic IP
  * Provides outbound internet access for resources in the private subnet

* **Public Route Table**

  * Route: `0.0.0.0/0 → Internet Gateway`

* **Private Route Table**

  * Route: `0.0.0.0/0 → NAT Gateway`

---

####  Security Groups

##### Web Security Group

Inbound access:

* SSH (`22`) – Operator IP only
* HTTP (`80`)
* HTTPS (`443`)
* Node.js API (`3000`)
* Vite (`5173`)

##### Database Security Group

Inbound access:

* MongoDB (`27017`) – Only from the Web Security Group
* SSH (`22`) – Only from the Web Security Group

This follows a **bastion-style access pattern**, where the database server is not directly exposed to the internet.

---

####  IAM

An EC2 IAM Role and Instance Profile are created with:

* `AmazonSSMManagedInstanceCore`

  * Enables AWS Systems Manager Session Manager access
  * Provides emergency access without requiring port 22 to be publicly accessible

* `AmazonEC2ContainerRegistryReadOnly`

  * Allows EC2 instances to pull images from Amazon ECR

---

####  EC2 Instances

##### Web / Application Server

* OS: **Amazon Linux 2023**
* Instance Type: `t3.small`
* Location: **Public Subnet**
* Storage: **20 GB gp3**
* EBS Encryption: **Enabled**

##### Database Server

* OS: **Amazon Linux 2023**
* Instance Type: `t3.small`
* Location: **Private Subnet**
* Storage: **30 GB gp3**
* EBS Encryption: **Enabled**
* Database: **MongoDB**

---

### 2.4 Deployment Steps

#### Step 1 – Configure Variables

Copy the example variables file:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Update `terraform.tfvars` with your actual values, including:

* Operator IP address
* SSH key path
* AWS configuration values

> **Note:** `terraform.tfvars` should remain gitignored because it contains environment-specific values.

---

#### Step 2 – Initialize Terraform

```bash
terraform init
```

---

#### Step 3 – Review the Infrastructure Plan

```bash
terraform plan
```

Review the resources Terraform is going to create.

---

#### Step 4 – Create the Infrastructure

```bash
terraform apply
```

Confirm the deployment when prompted.

---

#### Step 5 – Note Terraform Outputs

After the deployment completes, Terraform will display important outputs such as:

```text
web_server_public_ip
web_server_public_dns
db_server_private_ip
ssh_web_server
ssh_db_server_via_bastion
nat_gateway_ip
```

These values are required for the next stage of the deployment, particularly **Ansible configuration management**.

---

### 2.5 Terraform Outputs

| Output                      | Description                                                                    |
| --------------------------- | ------------------------------------------------------------------------------ |
| `web_server_public_ip`      | Public IP address of the Web/Application EC2 instance                          |
| `web_server_public_dns`     | AWS-assigned public DNS name of the Web/Application EC2 instance               |
| `db_server_private_ip`      | Private IP address of the MongoDB EC2 instance                                 |
| `ssh_web_server`            | Ready-to-use SSH command for connecting to the Web/Application server          |
| `ssh_db_server_via_bastion` | SSH `ProxyJump` command for connecting to the DB server through the Web server |
| `nat_gateway_ip`            | Elastic IP address assigned to the NAT Gateway                                 |

### Infrastructure Flow

```text
                         Internet
                            │
                            ▼
                    ┌───────────────┐
                    │ Internet GW   │
                    └───────┬───────┘
                            │
                  ┌─────────▼─────────┐
                  │   Public Subnet   │
                  │   10.0.1.0/24     │
                  │                   │
                  │  Web/App EC2      │
                  │  t3.small         │
                  └─────────┬─────────┘
                            │
                     ┌──────▼──────┐
                     │ NAT Gateway │
                     │ + Elastic IP│
                     └──────┬──────┘
                            │
                  ┌─────────▼─────────┐
                  │  Private Subnet   │
                  │   10.0.2.0/24     │
                  │                   │
                  │   MongoDB EC2     │
                  │   t3.small        │
                  └───────────────────┘
```


# 3. Part 2 – Configuration & Deployment with Ansible

## 3.1 Directory Structure

```text
ansible/
├── ansible.cfg              # Ansible connection and privilege settings
├── inventory.ini            # Web and database server inventory
├── database.yml             # MongoDB server configuration
└── web-server.yml           # Web server configuration
````

---

## 3.2 Ansible Configuration

### `ansible.cfg`

Contains Ansible configuration such as:

* SSH connection settings
* Privilege escalation
* Default inventory configuration

### `inventory.ini`

Defines the application servers:

* **webservers** – Public EC2 instance
* **databases** – Private EC2 instance

The database server is accessed through the web server using **SSH ProxyJump (bastion pattern)**.

---

## 3.3 Database Deployment

### `database.yml`

Configures the MongoDB server:

* Installs **MongoDB 7.0**
* Configures MongoDB authentication
* Creates the MongoDB admin user
* Creates the application database user
* Configures `mongod.conf` using Jinja2
* Binds MongoDB to the private IP
* Enables MongoDB authorization
* Starts and enables the MongoDB service
* Sets correct MongoDB directory ownership

---

## 3.4 Web Server Deployment

### `web-server.yml`

Configures the application server:

* Installs **Node.js 20 LTS**
* Installs **Nginx**
* Installs and configures **PM2**
* Clones the TravelMemory application
* Installs backend and frontend dependencies
* Generates backend and frontend `.env` files
* Builds the React frontend using Vite
* Starts the Express backend using PM2
* Configures Nginx as a reverse proxy
* Serves the React frontend
* Proxies `/api/` requests to the Express backend

---

## 3.5 Deployment

Run the database configuration first:

```bash
ansible-playbook database.yml
```

Then configure the web server:

```bash
ansible-playbook web-server.yml
```

The final architecture is:

```text
Internet
   │
   ▼
Nginx
   │
   ├── React Frontend
   │
   └── /api/ → Express + Node.js
                    │
                    ▼
                 MongoDB
              (Private Subnet)
```



## 4. How Application Components Interact
### 4.1 Frontend ↔ Backend
The React frontend is compiled into a static bundle during deployment (npm run build). Nginx serves this bundle directly. The frontend makes XHR/fetch requests to /api/* endpoints. Nginx's location /api/ block proxies these to the Express backend listening on localhost:3000, so no cross-origin issue arises from the browser's perspective (same origin for both assets and API).

### 4.2 Backend ↔ MongoDB
The Express application reads the MONGO_URL environment variable from .env, which is generated by Ansible with the private IP of the database server. The MongoDB instance listens only on its private IP and 127.0.0.1 — never on a public interface. Traffic between the web server and database server stays entirely within the VPC (no internet hops, no NAT).

### 4.3 PM2 Process Management
PM2 keeps the Node.js backend alive, restarts it on crash, and is configured to launch at system boot via pm2 startup systemd. Logs are accessible with pm2 logs travelmemory-backend.

### 4.4 NAT Gateway Purpose
The private subnet has no direct internet route. The NAT Gateway in the public subnet provides outbound internet access so the database server can: pull MongoDB packages during initial setup, receive OS security updates, and reach AWS services (SSM, CloudWatch, etc.). Inbound internet connections to the database server remain impossible.

# 5. Quick-Start Reference
Step 1 – Prerequisites
Install AWS CLI, Terraform >= 1.6, Ansible >= 2.14
Configure AWS CLI: aws configure
Generate SSH key pair: ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa

Step 2 – Terraform
cd terraform
cp terraform.tfvars.example terraform.tfvars
Fill in operator_ip_cidr (your IP/32) and public_key_path
terraform init && terraform plan && terraform apply
Record: WEB_IP = $(terraform output -raw web_server_public_ip)
Record: DB_IP = $(terraform output -raw db_server_private_ip)

Step 3 – Ansible
cd ../ansible
Edit inventory.ini: replace <WEB_PUBLIC_IP> and <DB_PRIVATE_IP> with Terraform outputs
Update group_vars/all.yml: change MongoDB passwords from defaults
Run: ansible-playbook site.yml -e "web_server_ip=$WEB_IP db_private_ip=$DB_IP"


Step 4 – Teardown (to avoid AWS charges)

```
cd terraform
terraform destroy
```
