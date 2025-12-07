output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "github_actions_role_arn" {
  value = aws_iam_role.gh_actions.arn
  description = "Put this ARN in GitHub Secrets as AWS_ROLE_TO_ASSUME"
}

output "configure_kubectl" {
  value = "aws eks update-kubeconfig --name ${var.cluster_name} --region ${var.region}"
}