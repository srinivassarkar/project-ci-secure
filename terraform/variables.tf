variable "cluster_name" {
  default = "eks-ci-secure"
}

variable "region" {
  default = "us-east-1"
}
variable "enable_k8s_apps" {
  description = "Deploy Kubernetes applications via Terraform"
  type        = bool
  default     = false
}
