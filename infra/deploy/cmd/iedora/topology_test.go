package main

import "testing"

func TestSurfaceTofuEnv(t *testing.T) {
	// The current canonical mapping. Adding/removing a surface URL env
	// flips this test deliberately — keep them in lockstep with
	// outputs.tf.
	want := map[string]string{
		"next_public_menu_url":    "NEXT_PUBLIC_MENU_URL",
		"core_base_url":           "CORE_BASE_URL",
		"next_public_core_url":    "NEXT_PUBLIC_CORE_URL",
		"core_trusted_origins":    "CORE_TRUSTED_ORIGINS",
		"next_public_imopush_url": "NEXT_PUBLIC_IMOPUSH_URL",
	}
	got := surfaceTofuEnv()
	if len(got) != len(want) {
		t.Fatalf("surfaceTofuEnv len = %d, want %d (got=%v)", len(got), len(want), got)
	}
	for k, v := range want {
		if got[k] != v {
			t.Errorf("surfaceTofuEnv[%q] = %q, want %q", k, got[k], v)
		}
	}
}

func TestProdURL(t *testing.T) {
	cases := map[string]string{
		"house":   "https://iedora.com",
		"menu":    "https://menu.iedora.com",
		"core":    "https://core.iedora.com",
		"imopush": "https://imopush.iedora.com",
	}
	for _, s := range surfaces {
		got := s.prodURL("iedora.com")
		if want := cases[s.name]; got != want {
			t.Errorf("surface %q prodURL = %q, want %q", s.name, got, want)
		}
	}
}

func TestTrustedOriginsProd(t *testing.T) {
	want := "https://iedora.com,https://www.iedora.com,https://menu.iedora.com,https://core.iedora.com,https://imopush.iedora.com"
	if got := trustedOriginsProd("iedora.com"); got != want {
		t.Errorf("trustedOriginsProd = %q, want %q", got, want)
	}
}

func TestTrustedOriginsLocal(t *testing.T) {
	// house has no localHostnames (apex has no dev hostname — it's
	// reachable via the /house path fallback). Trusted-origins
	// includes only surfaces that DO have local hosts.
	want := "http://menu.localhost:3000,http://core.localhost:3000,http://imopush.localhost:3000"
	if got := trustedOriginsLocal(3000); got != want {
		t.Errorf("trustedOriginsLocal = %q, want %q", got, want)
	}
}
