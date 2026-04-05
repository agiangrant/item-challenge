resource "aws_dynamodb_table" "exam_items" {
  name         = "${var.project_name}-${var.environment}-${var.dynamodb_table_name}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  range_key    = "version"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "version"
    type = "N"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "lastModified"
    type = "N"
  }

  attribute {
    name = "subject"
    type = "S"
  }

  global_secondary_index {
    name            = "status-lastModified-index"
    hash_key        = "status"
    range_key       = "lastModified"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "subject-lastModified-index"
    hash_key        = "subject"
    range_key       = "lastModified"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
