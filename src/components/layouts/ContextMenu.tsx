/**
 * @file Context menu component with nested submenu support.
 */

import { useEffect, useRef, useState, Activity } from "react";
import type { ContextMenuProps, MenuItem, MenuItemSubmenu, MenuPosition } from "./ContextMenu.types";
import styles from "./ContextMenu.module.css";

type SubmenuState = {
  item: MenuItemSubmenu;
  triggerRect: DOMRect;
  rootMenuX: number;
  depth: number;
} | null;

type CalculatePositionParams = {
  triggerPosition: MenuPosition;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
};

const calculateMenuPosition = ({
  triggerPosition,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
}: CalculatePositionParams): MenuPosition => {
  // eslint-disable-next-line no-restricted-syntax -- Position calculation requires mutable values for overflow checks
  let x = triggerPosition.x;
  // eslint-disable-next-line no-restricted-syntax -- Position calculation requires mutable values for overflow checks
  let y = triggerPosition.y;

  // Right overflow check
  if (x + menuWidth > viewportWidth) {
    x = viewportWidth - menuWidth - 8;
  }

  // Left overflow check
  if (x < 0) {
    x = 8;
  }

  // Bottom overflow check
  if (y + menuHeight > viewportHeight) {
    y = viewportHeight - menuHeight - 8;
  }

  // Top overflow check
  if (y < 0) {
    y = 8;
  }

  return { x, y };
};

type CalculateSubmenuPositionParams = {
  triggerRect: DOMRect;
  rootMenuX: number;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  depth: number;
};

const calculateSubmenuPosition = ({
  triggerRect,
  rootMenuX,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  depth,
}: CalculateSubmenuPositionParams): MenuPosition => {
  // eslint-disable-next-line no-restricted-syntax -- Position calculation requires mutable values for overflow checks
  let y = triggerRect.top;

  const rightX = triggerRect.right + 4;
  const leftX = triggerRect.left - menuWidth - 4;

  // Check if right side would overflow screen
  const wouldOverflowRight = rightX + menuWidth > viewportWidth - 8;

  // First level submenu (depth 0) always goes right unless it overflows
  // Deeper submenus prefer the side that keeps them closer to root
  const preferLeft =
    depth === 0
      ? false
      : (() => {
          const rightDistanceFromRoot = Math.abs(rightX + menuWidth / 2 - rootMenuX);
          const leftDistanceFromRoot = Math.abs(leftX + menuWidth / 2 - rootMenuX);
          return leftDistanceFromRoot < rightDistanceFromRoot;
        })();

  const x = wouldOverflowRight || preferLeft ? leftX : rightX;

  // Bottom overflow check
  if (y + menuHeight > viewportHeight - 8) {
    y = viewportHeight - menuHeight - 8;
  }

  // Top overflow check
  if (y < 8) {
    y = 8;
  }

  return { x, y };
};

type MenuItemComponentProps = {
  item: MenuItem;
  onSubmenuOpen: (item: MenuItemSubmenu, triggerElement: HTMLElement) => void;
  onItemEnter: (item: MenuItem) => void;
};

const MenuItemComponent = ({ item, onSubmenuOpen, onItemEnter }: MenuItemComponentProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

  if (item.type === "separator") {
    return <div className={styles.separator} />;
  }

  const getDisabledAttribute = () => {
    return item.disabled ? "true" : "false";
  };

  const renderIcon = () => {
    if (item.icon === undefined) {
      return null;
    }
    return <span className={styles.menuItemIcon}>{item.icon}</span>;
  };

  const renderShortcut = () => {
    if (item.type !== "action" || item.shortcut === undefined) {
      return null;
    }
    return <span className={styles.menuItemShortcut}>{item.shortcut}</span>;
  };

  if (item.type === "submenu") {
    return (
      <div
        ref={itemRef}
        className={styles.menuItem}
        data-disabled={getDisabledAttribute()}
        onPointerEnter={() => {
          if (item.disabled) {
            return;
          }
          if (itemRef.current === null) {
            return;
          }
          onItemEnter(item);
          onSubmenuOpen(item, itemRef.current);
        }}
      >
        {renderIcon()}
        <span className={styles.menuItemLabel}>{item.label}</span>
        <span className={styles.menuItemArrow} />
      </div>
    );
  }

  const handleClick = () => {
    if (item.disabled) {
      return;
    }
    item.onClick();
  };

  return (
    <div
      className={styles.menuItem}
      data-disabled={getDisabledAttribute()}
      onClick={handleClick}
      onPointerEnter={() => {
        onItemEnter(item);
      }}
    >
      {renderIcon()}
      <span className={styles.menuItemLabel}>{item.label}</span>
      {renderShortcut()}
    </div>
  );
};

export const ContextMenu = ({ items, position, onClose }: ContextMenuProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [submenuState, setSubmenuState] = useState<SubmenuState>(null);
  const isOverSubmenuRef = useRef<boolean>(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }

    if (position === null) {
      dialog.close();
      setSubmenuState(null);
      return;
    }

    if (dialog.open) {
      return;
    }

    dialog.showModal();

    const menu = menuRef.current;
    if (menu === null) {
      return;
    }

    const rect = menu.getBoundingClientRect();
    const calculatedPosition = calculateMenuPosition({
      triggerPosition: position,
      menuWidth: rect.width,
      menuHeight: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    setMenuPosition(calculatedPosition);
  }, [position]);

  const handleSubmenuOpen = (item: MenuItemSubmenu, triggerElement: HTMLElement) => {
    const triggerRect = triggerElement.getBoundingClientRect();
    const rootMenuRect = menuRef.current?.getBoundingClientRect();
    if (rootMenuRect === undefined) {
      return;
    }
    setSubmenuState({
      item,
      triggerRect,
      rootMenuX: rootMenuRect.left,
      depth: 0,
    });
  };

  const handleItemEnter = (item: MenuItem) => {
    if (item.type !== "submenu") {
      if (!isOverSubmenuRef.current) {
        setSubmenuState(null);
      }
    }
  };

  const handleSubmenuPointerEnter = () => {
    isOverSubmenuRef.current = true;
  };

  const handleSubmenuPointerLeave = () => {
    isOverSubmenuRef.current = false;
  };

  const getActivityMode = () => {
    return submenuState !== null ? "visible" : "hidden";
  };

  const renderSubmenu = () => {
    if (submenuState === null) {
      return null;
    }
    return (
      <div onPointerEnter={handleSubmenuPointerEnter} onPointerLeave={handleSubmenuPointerLeave}>
        <Submenu
          items={submenuState.item.items}
          triggerRect={submenuState.triggerRect}
          rootMenuX={submenuState.rootMenuX}
          depth={submenuState.depth}
          onClose={onClose}
        />
      </div>
    );
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.overlay} onClick={onClose} />
      <div
        ref={menuRef}
        className={styles.menu}
        style={{
          position: "absolute",
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`,
        }}
      >
        {items.map((item, index) => (
          <MenuItemComponent key={index} item={item} onSubmenuOpen={handleSubmenuOpen} onItemEnter={handleItemEnter} />
        ))}
      </div>

      <Activity mode={getActivityMode()}>{renderSubmenu()}</Activity>
    </dialog>
  );
};

type SubmenuProps = {
  items: MenuItem[];
  triggerRect: DOMRect;
  rootMenuX: number;
  depth: number;
  onClose: () => void;
};

const Submenu = ({ items, triggerRect, rootMenuX, depth, onClose }: SubmenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ x: 0, y: 0 });
  const [submenuState, setSubmenuState] = useState<SubmenuState>(null);
  const isOverSubmenuRef = useRef<boolean>(false);

  useEffect(() => {
    const menu = menuRef.current;
    if (menu === null) {
      return;
    }

    const rect = menu.getBoundingClientRect();
    const calculatedPosition = calculateSubmenuPosition({
      triggerRect,
      rootMenuX,
      menuWidth: rect.width,
      menuHeight: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      depth,
    });

    setMenuPosition(calculatedPosition);
  }, [triggerRect, rootMenuX, depth]);

  const handleSubmenuOpen = (item: MenuItemSubmenu, triggerElement: HTMLElement) => {
    const triggerRect = triggerElement.getBoundingClientRect();
    setSubmenuState({ item, triggerRect, rootMenuX, depth: depth + 1 });
  };

  const handleItemEnter = (item: MenuItem) => {
    if (item.type !== "submenu") {
      if (!isOverSubmenuRef.current) {
        setSubmenuState(null);
      }
    }
  };

  const handleSubmenuPointerEnter = () => {
    isOverSubmenuRef.current = true;
  };

  const handleSubmenuPointerLeave = () => {
    isOverSubmenuRef.current = false;
  };

  const getActivityMode = () => {
    return submenuState !== null ? "visible" : "hidden";
  };

  const renderSubmenu = () => {
    if (submenuState === null) {
      return null;
    }
    return (
      <div onPointerEnter={handleSubmenuPointerEnter} onPointerLeave={handleSubmenuPointerLeave}>
        <Submenu
          items={submenuState.item.items}
          triggerRect={submenuState.triggerRect}
          rootMenuX={submenuState.rootMenuX}
          depth={submenuState.depth}
          onClose={onClose}
        />
      </div>
    );
  };

  return (
    <>
      <div
        ref={menuRef}
        className={styles.menu}
        style={{
          position: "absolute",
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`,
        }}
      >
        {items.map((item, index) => (
          <MenuItemComponent key={index} item={item} onSubmenuOpen={handleSubmenuOpen} onItemEnter={handleItemEnter} />
        ))}
      </div>

      <Activity mode={getActivityMode()}>{renderSubmenu()}</Activity>
    </>
  );
};
