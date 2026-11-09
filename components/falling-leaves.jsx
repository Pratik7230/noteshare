"use client";

import dynamic from "next/dynamic";

const Leaves = dynamic(
  () => import("falling-leaves/react").then((mod) => mod.FallingLeaves),
  { ssr: false }
);

export function FallingLeaves({ fullscreen, fullScreen = true, ...props }) {
  return <Leaves fullScreen={fullScreen ?? fullscreen} {...props} />;
}

export default FallingLeaves;

