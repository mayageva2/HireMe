resource "aws_cloudwatch_log_group" "this" {
  for_each          = var.functions
  name              = "/aws/lambda/${var.name_prefix}-${each.key}"
  retention_in_days = 14
  tags              = var.tags
}

resource "aws_lambda_function" "this" {
  for_each = var.functions

  function_name    = "${var.name_prefix}-${each.key}"
  role             = var.role_arn
  filename         = each.value.zip_path
  source_code_hash = filebase64sha256(each.value.zip_path)
  handler          = each.value.handler
  runtime          = each.value.runtime
  architectures    = ["x86_64"]
  timeout          = each.value.timeout
  memory_size      = each.value.memory_size

  environment {
    variables = each.value.environment
  }

  depends_on = [aws_cloudwatch_log_group.this]
  tags       = merge(var.tags, { Name = "${var.name_prefix}-${each.key}" })
}
