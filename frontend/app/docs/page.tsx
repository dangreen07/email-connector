"use client";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { RedocStandalone } from "redoc";

export default function DocsPage() {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    // Theme stays in light mode
    setTheme("light");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return (
    <div>
      <RedocStandalone
        specUrl="/openapi.yaml"
        options={{
          hideDownloadButton: true,
        }}
      />
    </div>
  );
}
