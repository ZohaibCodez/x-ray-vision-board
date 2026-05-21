import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "XRayVision AI — See Beyond the Surface" },
      {
        name: "description",
        content:
          "AI-powered radiology assistant. Multi-model ensemble for chest pathology, fracture detection, and wound classification — synthesized into actionable clinical insights.",
      },
      { property: "og:title", content: "XRayVision AI — See Beyond the Surface" },
      {
        property: "og:description",
        content:
          "AI-powered radiology assistant. Diagnose with precision using a multi-model ensemble.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <Landing />;
}
