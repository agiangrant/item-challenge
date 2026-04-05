variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
}

variable "handler" {
  description = "Handler entry point (e.g. handlers/createItem.handler)"
  type        = string
}

variable "source_dir" {
  description = "Path to the directory containing compiled handler code"
  type        = string
}

variable "deployment_bucket_id" {
  description = "S3 bucket ID for Lambda deployment packages"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs20.x"
}

variable "memory_size" {
  description = "Lambda memory in MB"
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table. If non-empty, grants dynamodb:* on the table and its indexes."
  type        = string
  default     = ""
}

variable "api_gateway_rest_api_id" {
  description = "ID of the API Gateway REST API"
  type        = string
  default     = ""
}

variable "api_gateway_rest_api_execution_arn" {
  description = "Execution ARN of the API Gateway REST API"
  type        = string
  default     = ""
}

variable "endpoint_configs" {
  description = "API Gateway endpoint configurations. Empty list means no APIGW integration."
  type = list(object({
    http_method = string
    resource_id = string
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
