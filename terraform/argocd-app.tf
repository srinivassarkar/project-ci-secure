resource "kubernetes_manifest" "color_palette_app" {
  count = var.enable_k8s_apps ? 1 : 0
  manifest = yamldecode(file("${path.module}/../argocd/color-palette.yaml"))

  depends_on = [
    helm_release.argocd
  ]
}
