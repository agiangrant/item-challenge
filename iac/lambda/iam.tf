data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  tags               = var.tags
}

# CloudWatch Logs
data "aws_iam_policy_document" "logs" {
  statement {
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }
}

resource "aws_iam_role_policy" "logs" {
  name   = "${var.function_name}-logs"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.logs.json
}

# DynamoDB — only created when a table ARN is provided
data "aws_iam_policy_document" "dynamodb" {
  count = var.dynamodb_table_arn != "" ? 1 : 0

  statement {
    actions = ["dynamodb:*"]
    resources = [
      var.dynamodb_table_arn,
      "${var.dynamodb_table_arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "dynamodb" {
  count = var.dynamodb_table_arn != "" ? 1 : 0

  name   = "${var.function_name}-dynamodb"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.dynamodb[0].json
}
