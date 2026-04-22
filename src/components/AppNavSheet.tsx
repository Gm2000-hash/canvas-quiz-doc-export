import * as React from "react";

/**
 * Deprecated: the global hamburger menu is replaced by the persistent
 * left workspace sidebar (`WorkspaceSidebar`) provided by `AppShell`.
 *
 * This component is kept as a no-op so existing page headers don't need
 * to be edited individually. It renders nothing.
 */
interface AppNavSheetProps {
  onOpenSettings?: () => void;
  showSettings?: boolean;
}

export const AppNavSheet = React.forwardRef<HTMLDivElement, AppNavSheetProps>(
  function AppNavSheet(_props, _ref) {
    return null;
  },
);
