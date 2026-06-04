import unittest

from role_registry import (
    display_name,
    list_roles,
    normalize_role_id,
    resolve_role_id,
    role_ids_for_service,
    services_for_role_id,
)


class RoleRegistryTests(unittest.TestCase):
    def test_ciso_alias_resolves_to_canonical_role(self) -> None:
        self.assertEqual(resolve_role_id("CISO"), "ciso-head-of-security")
        self.assertEqual(
            resolve_role_id("CISO / Head of Security"), "ciso-head-of-security"
        )

    def test_ciso_role_maps_to_both_services(self) -> None:
        service_ids = services_for_role_id("ciso-head-of-security")
        self.assertIn("information-security-strategy-planning", service_ids)
        self.assertIn("enterprise-security-governance", service_ids)

    def test_display_name_for_role_id(self) -> None:
        self.assertEqual(
            display_name("ciso-head-of-security"), "CISO / Head of Security"
        )

    def test_list_roles_used_only(self) -> None:
        roles = list_roles(used_only=True)
        role_ids = {role["role_id"] for role in roles}
        self.assertIn("ciso-head-of-security", role_ids)
        self.assertNotIn("", role_ids)

    def test_service_role_ids_present(self) -> None:
        iss_role_ids = role_ids_for_service("information-security-strategy-planning")
        esg_role_ids = role_ids_for_service("enterprise-security-governance")
        self.assertIn("ciso-head-of-security", iss_role_ids)
        self.assertIn("ciso-head-of-security", esg_role_ids)
        self.assertNotIn("security-pmo-portfolio-manager", iss_role_ids)

    def test_deprecated_role_ids_normalize(self) -> None:
        self.assertEqual(
            normalize_role_id("security-pmo-portfolio-manager"),
            "security-program-strategy-lead",
        )
        self.assertEqual(
            resolve_role_id("Security PMO / portfolio manager"),
            "security-program-strategy-lead",
        )
        self.assertEqual(
            services_for_role_id("security-metrics-owner"),
            services_for_role_id("security-program-strategy-lead"),
        )


if __name__ == "__main__":
    unittest.main()
