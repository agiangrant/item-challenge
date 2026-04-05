provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
  }

  lambda_environment = {
    USE_DYNAMODB        = "true"
    DYNAMODB_TABLE_NAME = aws_dynamodb_table.exam_items.name
  }
}

resource "aws_s3_bucket" "lambda_deployments" {
  bucket = "${var.project_name}-${var.environment}-lambda-deployments"

  tags = local.common_tags
}

resource "aws_s3_bucket_versioning" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "lambda_deployments" {
  bucket = aws_s3_bucket.lambda_deployments.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

module "create_item" {
  source = "./lambda"

  function_name         = "${var.project_name}-${var.environment}-createItem"
  handler               = "handlers/createItem.handler"
  source_dir            = "${path.root}/../dist"
  deployment_bucket_id  = aws_s3_bucket.lambda_deployments.id
  environment_variables = local.lambda_environment
  dynamodb_table_arn    = aws_dynamodb_table.exam_items.arn
  tags                  = local.common_tags

  api_gateway_rest_api_id            = aws_api_gateway_rest_api.main.id
  api_gateway_rest_api_execution_arn = aws_api_gateway_rest_api.main.execution_arn
  endpoint_configs = [
    { http_method = "POST", resource_id = aws_api_gateway_resource.items.id }
  ]
}

module "get_item" {
  source = "./lambda"

  function_name         = "${var.project_name}-${var.environment}-getItem"
  handler               = "handlers/getItem.handler"
  source_dir            = "${path.root}/../dist"
  deployment_bucket_id  = aws_s3_bucket.lambda_deployments.id
  environment_variables = local.lambda_environment
  dynamodb_table_arn    = aws_dynamodb_table.exam_items.arn
  tags                  = local.common_tags

  api_gateway_rest_api_id            = aws_api_gateway_rest_api.main.id
  api_gateway_rest_api_execution_arn = aws_api_gateway_rest_api.main.execution_arn
  endpoint_configs = [
    { http_method = "GET", resource_id = aws_api_gateway_resource.item_id.id }
  ]
}

module "update_item" {
  source = "./lambda"

  function_name         = "${var.project_name}-${var.environment}-updateItem"
  handler               = "handlers/updateItem.handler"
  source_dir            = "${path.root}/../dist"
  deployment_bucket_id  = aws_s3_bucket.lambda_deployments.id
  environment_variables = local.lambda_environment
  dynamodb_table_arn    = aws_dynamodb_table.exam_items.arn
  tags                  = local.common_tags

  api_gateway_rest_api_id            = aws_api_gateway_rest_api.main.id
  api_gateway_rest_api_execution_arn = aws_api_gateway_rest_api.main.execution_arn
  endpoint_configs = [
    { http_method = "PUT", resource_id = aws_api_gateway_resource.item_id.id }
  ]
}

module "list_items" {
  source = "./lambda"

  function_name         = "${var.project_name}-${var.environment}-listItems"
  handler               = "handlers/listItems.handler"
  source_dir            = "${path.root}/../dist"
  deployment_bucket_id  = aws_s3_bucket.lambda_deployments.id
  environment_variables = local.lambda_environment
  dynamodb_table_arn    = aws_dynamodb_table.exam_items.arn
  tags                  = local.common_tags

  api_gateway_rest_api_id            = aws_api_gateway_rest_api.main.id
  api_gateway_rest_api_execution_arn = aws_api_gateway_rest_api.main.execution_arn
  endpoint_configs = [
    { http_method = "GET", resource_id = aws_api_gateway_resource.items.id }
  ]
}

module "create_version" {
  source = "./lambda"

  function_name         = "${var.project_name}-${var.environment}-createVersion"
  handler               = "handlers/createVersion.handler"
  source_dir            = "${path.root}/../dist"
  deployment_bucket_id  = aws_s3_bucket.lambda_deployments.id
  environment_variables = local.lambda_environment
  dynamodb_table_arn    = aws_dynamodb_table.exam_items.arn
  tags                  = local.common_tags

  api_gateway_rest_api_id            = aws_api_gateway_rest_api.main.id
  api_gateway_rest_api_execution_arn = aws_api_gateway_rest_api.main.execution_arn
  endpoint_configs = [
    { http_method = "POST", resource_id = aws_api_gateway_resource.versions.id }
  ]
}

module "get_audit_trail" {
  source = "./lambda"

  function_name         = "${var.project_name}-${var.environment}-getAuditTrail"
  handler               = "handlers/getAuditTrail.handler"
  source_dir            = "${path.root}/../dist"
  deployment_bucket_id  = aws_s3_bucket.lambda_deployments.id
  environment_variables = local.lambda_environment
  dynamodb_table_arn    = aws_dynamodb_table.exam_items.arn
  tags                  = local.common_tags

  api_gateway_rest_api_id            = aws_api_gateway_rest_api.main.id
  api_gateway_rest_api_execution_arn = aws_api_gateway_rest_api.main.execution_arn
  endpoint_configs = [
    { http_method = "GET", resource_id = aws_api_gateway_resource.audit.id }
  ]
}
