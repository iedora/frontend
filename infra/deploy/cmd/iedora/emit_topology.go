package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// `iedora emit-topology` writes the surface registry to a JSON file
// shaped as Tofu auto-tfvars. Tofu loads
// `infra/iac/tofu/generated/topology.auto.tfvars.json` automatically
// on every plan/apply, so tunnel.tf + outputs.tf can `var.surfaces`
// against the same source of truth that products.go + the local
// runtime already consume.
//
// Re-run after editing topology.go. CI can guard drift with
// `--check`: exits 1 if the on-disk file disagrees with the in-memory
// registry.

// tofuSurface — JSON shape consumed by Tofu. Mirrors `surface` but:
//   - subdomains is a list (apex `house` answers to both "" and
//     "www"), letting Tofu iterate flat.
//   - service is the in-network upstream the tunnel ingress routes
//     to — derived from the product the surface serves. Today every
//     surface serves "web" which lives in the infra-web container.
//   - zone is intentionally absent — Tofu owns it (var.zone_name)
//     and composes hostnames itself.
type tofuSurface struct {
	Name          string   `json:"name"`
	Subdomains    []string `json:"subdomains"`
	TrustedOrigin bool     `json:"trusted_origin"`
	PublicURLEnv  string   `json:"public_url_env"`
	NextPublicEnv string   `json:"next_public_env"`
	Service       string   `json:"service"`
}

type tofuTopology struct {
	Surfaces []tofuSurface `json:"surfaces"`
}

// tofuTopologyJSON returns the canonical JSON body. Stable ordering
// (registry order) so `--check` is deterministic.
func tofuTopologyJSON() ([]byte, error) {
	out := tofuTopology{Surfaces: make([]tofuSurface, 0, len(surfaces))}
	for _, s := range surfaces {
		subs := []string{s.subdomain}
		// Apex (house) also answers to www — keep parity with the
		// pre-PR4 tunnel.tf ingress that listed both rows.
		if s.subdomain == "" {
			subs = append(subs, "www")
		}
		out.Surfaces = append(out.Surfaces, tofuSurface{
			Name:          s.name,
			Subdomains:    subs,
			TrustedOrigin: s.trustedOrigin,
			PublicURLEnv:  s.publicURLEnv,
			NextPublicEnv: s.nextPublicEnv,
			Service:       serviceForProduct(s.serves),
		})
	}
	return json.MarshalIndent(out, "", "  ")
}

// serviceForProduct resolves the in-network URL that the named
// product's container exposes. Today only "web" exists.
func serviceForProduct(name string) string {
	for _, p := range products {
		if p.name != name {
			continue
		}
		if d, ok := p.runtime.(*dockerOnHetzner); ok {
			return fmt.Sprintf("http://%s:%d", d.containerName, 3000)
		}
	}
	panic("emit-topology: no docker product named " + name)
}

// emitTarget — one (path, body) pair the emitter writes or checks.
type emitTarget struct {
	label string
	path  string
	body  []byte
}

func runEmitTopology(_ context.Context, argv []string) error {
	fs := flag.NewFlagSet("emit-topology", flag.ContinueOnError)
	// .auto.tfvars.json files are auto-loaded by Tofu ONLY from the
	// chdir root (infra/iac/tofu/), not subdirectories — that's why
	// it lives next to variables.tf rather than under generated/.
	tfvarsOut := fs.String("tfvars-out", "infra/iac/tofu/topology.auto.tfvars.json", "path for the Tofu auto-tfvars JSON")
	tsOut := fs.String("ts-out", "apps/web/src/generated/surfaces.ts", "path for the proxy.ts surface registry TS file")
	check := fs.Bool("check", false, "exit 1 if any on-disk file disagrees with the registry (CI drift guard)")
	if err := fs.Parse(argv); err != nil {
		return err
	}

	tfvarsBody, err := tofuTopologyJSON()
	if err != nil {
		return err
	}
	tfvarsBody = append(tfvarsBody, '\n')

	targets := []emitTarget{
		{label: "tfvars", path: *tfvarsOut, body: tfvarsBody},
		{label: "ts", path: *tsOut, body: surfaceTS()},
	}

	var stale []string
	for i := range targets {
		abs, err := filepath.Abs(targets[i].path)
		if err != nil {
			return err
		}
		targets[i].path = abs

		if *check {
			got, err := os.ReadFile(abs)
			if err != nil {
				return fmt.Errorf("emit-topology --check (%s): read %s: %w", targets[i].label, abs, err)
			}
			if string(got) != string(targets[i].body) {
				stale = append(stale, abs)
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(abs, targets[i].body, 0o644); err != nil {
			return err
		}
		fmt.Fprintf(os.Stderr, "iedora emit-topology: wrote %s\n", abs)
	}

	if *check {
		if len(stale) > 0 {
			return fmt.Errorf("emit-topology --check: stale (re-run `iedora emit-topology`):\n  %s", strings.Join(stale, "\n  "))
		}
		fmt.Fprintln(os.Stderr, "iedora emit-topology --check: all targets up to date")
	}
	return nil
}

// surfaceTS renders the proxy.ts surface registry as a deterministic
// TypeScript file. Mirrors topology.go::surfaces — the surface NAME
// + every host (prod + local) the surface answers to, plus the URL
// prefix proxy.ts should rewrite into.
//
// Production hostnames are emitted as template literals over
// BRAND_DOMAIN (imported from @iedora/brand) so the apex string is
// not hardcoded; product surface names are emitted as PRODUCTS.<name>
// for the same reason (and so a rename in PRODUCTS surfaces as a
// compile error here).
func surfaceTS() []byte {
	var b strings.Builder
	b.WriteString("// AUTO-GENERATED by `iedora emit-topology` from infra/deploy/cmd/iedora/topology.go.\n")
	b.WriteString("// DO NOT EDIT — re-run the command and commit the diff.\n")
	b.WriteString("\n")
	b.WriteString("import { BRAND_DOMAIN, PRODUCTS } from '@iedora/brand'\n\n")
	b.WriteString("export type Surface = {\n")
	b.WriteString("  readonly name: string\n")
	b.WriteString("  readonly hosts: ReadonlyArray<string>\n")
	b.WriteString("  // URL prefix proxy.ts rewrites traffic under (e.g. \"/core\").\n")
	b.WriteString("  // Empty string means this surface owns the URL root (no rewrite).\n")
	b.WriteString("  readonly rewritePath: string\n")
	b.WriteString("}\n\n")
	b.WriteString("export const surfaces: ReadonlyArray<Surface> = [\n")
	for _, s := range surfaces {
		b.WriteString("  {\n")
		if productSurfaces[s.name] {
			fmt.Fprintf(&b, "    name: PRODUCTS.%s,\n", s.name)
		} else {
			fmt.Fprintf(&b, "    name: %q,\n", s.name)
		}
		b.WriteString("    hosts: [")
		// Production hosts first (apex + extras), then local.
		first := true
		emitProd := func(sub string) {
			if !first {
				b.WriteString(", ")
			}
			first = false
			if sub == "" {
				b.WriteString("BRAND_DOMAIN")
			} else {
				fmt.Fprintf(&b, "`%s.${BRAND_DOMAIN}`", sub)
			}
		}
		emitProd(s.subdomain)
		if s.subdomain == "" {
			emitProd("www")
		}
		for _, h := range s.localHostnames {
			if !first {
				b.WriteString(", ")
			}
			first = false
			fmt.Fprintf(&b, "%q", h)
		}
		b.WriteString("],\n")
		fmt.Fprintf(&b, "    rewritePath: %q,\n", s.rewritePath())
		b.WriteString("  },\n")
	}
	b.WriteString("]\n\n")
	b.WriteString("// surfaceByHost returns the surface whose host list contains `host`,\n")
	b.WriteString("// or undefined. O(N) over a small list — no map needed.\n")
	b.WriteString("export function surfaceByHost(host: string): Surface | undefined {\n")
	b.WriteString("  return surfaces.find((s) => s.hosts.includes(host))\n")
	b.WriteString("}\n")
	return []byte(b.String())
}
