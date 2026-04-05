output "api_url" {
  description = "API Gateway invoke URL"
  value       = aws_api_gateway_stage.main.invoke_url
}

output "lambda_deployment_bucket" {
  description = "S3 bucket for Lambda deployment packages"
  value       = aws_s3_bucket.lambda_deployments.id
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.exam_items.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.exam_items.arn
}

output "function_arns" {
  description = "ARNs of all Lambda functions"
  value = {
    create_item    = module.create_item.function_arn
    get_item       = module.get_item.function_arn
    update_item    = module.update_item.function_arn
    list_items     = module.list_items.function_arn
    create_version = module.create_version.function_arn
    get_audit_trail = module.get_audit_trail.function_arn
  }
}
