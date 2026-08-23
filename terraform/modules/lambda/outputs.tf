output "function_arns" {
  value = { for key, function in aws_lambda_function.this : key => function.arn }
}

output "function_names" {
  value = { for key, function in aws_lambda_function.this : key => function.function_name }
}

output "invoke_arns" {
  value = { for key, function in aws_lambda_function.this : key => function.invoke_arn }
}
