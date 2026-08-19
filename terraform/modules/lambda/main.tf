variable "name_prefix" {
  type = string
}

variable "role_arn" {
  type        = string
  description = "Existing Lambda execution role ARN (use Academy LabRole in restricted labs)."
}

variable "functions" {
  type = map(object({
    zip_path    = string
    handler     = optional(string, "lambda_function.lambda_handler")
    runtime     = optional(string, "python3.12")
    timeout     = optional(number, 30)
    memory_size = optional(number, 256)
    environment = optional(map(string), {})
  }))
}

variable "tags" {
  type    = map(string)
  default = {}
}

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

output "function_arns" {
  value = { for key, function in aws_lambda_function.this : key => function.arn }
}

output "function_names" {
  value = { for key, function in aws_lambda_function.this : key => function.function_name }
}

output "invoke_arns" {
  value = { for key, function in aws_lambda_function.this : key => function.invoke_arn }
}
