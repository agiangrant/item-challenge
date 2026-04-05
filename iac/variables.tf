variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "item-challenge"
}

variable "dynamodb_table_name" {
  description = "Base name for the DynamoDB table"
  type        = string
  default     = "ExamItems"
}
