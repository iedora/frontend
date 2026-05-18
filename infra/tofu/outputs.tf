output "backups_bucket_name" {
  description = "Name of the R2 bucket holding Postgres dumps."
  value       = cloudflare_r2_bucket.backups.name
}

output "backups_r2_access_key_id" {
  description = "R2 S3-compatible Access Key ID for the backups accessory."
  value       = cloudflare_api_token.backups_r2.id
}

output "backups_r2_secret_access_key" {
  description = "R2 S3-compatible Secret Access Key (SHA-256 of the token value)."
  value       = sha256(cloudflare_api_token.backups_r2.value)
  sensitive   = true
}

output "ci_tailscale_federated_id" {
  description = "Federated identity client ID — passed to tailscale/github-action@v4 as `oauth-client-id`."
  value       = tailscale_federated_identity.ci.id
}

output "ci_tailscale_federated_audience" {
  description = "Audience claim that GitHub's OIDC token must match. Tailscale auto-generates this; passed to the github action as `audience`."
  value       = tailscale_federated_identity.ci.audience
}

# Legacy outputs (kept during the WIF migration window). Removable after
# the federated identity is validated end-to-end.
output "ci_tailscale_oauth_client_id" {
  description = "Legacy. OAuth client ID — replaced by federated identity. Removable after WIF validation."
  value       = tailscale_oauth_client.ci.id
}

output "ci_tailscale_oauth_client_secret" {
  description = "Legacy. OAuth client secret — replaced by federated identity. Removable after WIF validation."
  value       = tailscale_oauth_client.ci.key
  sensitive   = true
}
