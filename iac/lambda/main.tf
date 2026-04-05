data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/.builds/${var.function_name}.zip"
}

resource "aws_s3_object" "lambda" {
  bucket = var.deployment_bucket_id
  key    = "${var.function_name}/${data.archive_file.lambda.output_md5}.zip"
  source = data.archive_file.lambda.output_path
  etag   = data.archive_file.lambda.output_md5
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14
  tags              = var.tags
}

resource "aws_lambda_function" "this" {
  function_name = var.function_name
  handler       = var.handler
  runtime       = var.runtime
  memory_size   = var.memory_size
  timeout       = var.timeout
  role          = aws_iam_role.lambda.arn
  s3_bucket     = var.deployment_bucket_id
  s3_key        = aws_s3_object.lambda.key

  source_code_hash = data.archive_file.lambda.output_base64sha256

  dynamic "environment" {
    for_each = length(var.environment_variables) > 0 ? [1] : []
    content {
      variables = var.environment_variables
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.logs,
    aws_s3_object.lambda,
  ]

  tags = var.tags
}

# --- API Gateway integration (conditional) ---

resource "aws_api_gateway_method" "this" {
  count = length(var.endpoint_configs)

  rest_api_id   = var.api_gateway_rest_api_id
  resource_id   = var.endpoint_configs[count.index].resource_id
  http_method   = var.endpoint_configs[count.index].http_method
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "this" {
  count = length(var.endpoint_configs)

  rest_api_id             = var.api_gateway_rest_api_id
  resource_id             = var.endpoint_configs[count.index].resource_id
  http_method             = aws_api_gateway_method.this[count.index].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.this.invoke_arn
}

resource "aws_lambda_permission" "apigw" {
  count = length(var.endpoint_configs)

  statement_id  = "AllowAPIGateway-${count.index}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_gateway_rest_api_execution_arn}/*/${var.endpoint_configs[count.index].http_method}/*"
}
