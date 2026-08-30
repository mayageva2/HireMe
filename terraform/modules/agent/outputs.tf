output "ecr_repository_url" {
  value = aws_ecr_repository.agent.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.agent.name
}

output "ecs_service_name" {
  value = aws_ecs_service.agent.name
}

output "secret_arn" {
  value = aws_secretsmanager_secret.agent.arn
}

output "secret_name" {
  value = aws_secretsmanager_secret.agent.name
}
