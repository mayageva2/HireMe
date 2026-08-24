output "role_arn" {
  value = var.create ? aws_iam_role.lambda[0].arn : var.existing_role_arn
}
