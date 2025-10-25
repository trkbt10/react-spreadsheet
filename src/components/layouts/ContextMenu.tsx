import { useEffect, useRef, useState, Activity } from 'react';
import type {
  ContextMenuProps,
  MenuItem,
  MenuItemAction,
  MenuItemSubmenu,
  MenuPosition,
} from './ContextMenu.types';
import styles from './ContextMenu.module.css';

type SubmenuState = {
  item: MenuItemSubmenu;
  position: MenuPosition;
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
  let x = triggerPosition.x;
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

type MenuItemComponentProps = {
  item: MenuItem;
  onSubmenuOpen: (item: MenuItemSubmenu, triggerElement: HTMLElement) => void;
  onItemEnter: (item: MenuItem) => void;
  activeSubmenu: MenuItemSubmenu | null;
};

const MenuItemComponent = ({
  item,
  onSubmenuOpen,
  onItemEnter,
  activeSubmenu,
}: MenuItemComponentProps) => {
  const itemRef = useRef<HTMLDivElement>(null);

  if (item.type === 'separator') {
    return <div className={styles.separator} />;
  }

  if (item.type === 'submenu') {
    return (
      <div
        ref={itemRef}
        className={styles.menuItem}
        data-disabled={item.disabled ? 'true' : 'false'}
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
        {item.icon !== undefined ? (
          <span className={styles.menuItemIcon}>{item.icon}</span>
        ) : null}
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
      data-disabled={item.disabled ? 'true' : 'false'}
      onClick={handleClick}
      onPointerEnter={() => {
        onItemEnter(item);
      }}
    >
      {item.icon !== undefined ? (
        <span className={styles.menuItemIcon}>{item.icon}</span>
      ) : null}
      <span className={styles.menuItemLabel}>{item.label}</span>
      {item.shortcut !== undefined ? (
        <span className={styles.menuItemShortcut}>{item.shortcut}</span>
      ) : null}
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
    const rect = triggerElement.getBoundingClientRect();
    const submenuPosition: MenuPosition = {
      x: rect.right + 4,
      y: rect.top,
    };

    setSubmenuState({ item, position: submenuPosition });
  };

  const handleItemEnter = (item: MenuItem) => {
    if (item.type !== 'submenu') {
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

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div
        className={styles.overlay}
        onClick={onClose}
      />
      <div
        ref={menuRef}
        className={styles.menu}
        style={{
          position: 'absolute',
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`,
        }}
      >
        {items.map((item, index) => (
          <MenuItemComponent
            key={index}
            item={item}
            onSubmenuOpen={handleSubmenuOpen}
            onItemEnter={handleItemEnter}
            activeSubmenu={submenuState?.item ?? null}
          />
        ))}
      </div>

      <Activity mode={submenuState !== null ? 'visible' : 'hidden'}>
        {submenuState !== null ? (
          <div
            onPointerEnter={handleSubmenuPointerEnter}
            onPointerLeave={handleSubmenuPointerLeave}
          >
            <Submenu
              items={submenuState.item.items}
              position={submenuState.position}
              onClose={onClose}
            />
          </div>
        ) : null}
      </Activity>
    </dialog>
  );
};

type SubmenuProps = {
  items: MenuItem[];
  position: MenuPosition;
  onClose: () => void;
};

const Submenu = ({ items, position, onClose }: SubmenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(position);
  const [submenuState, setSubmenuState] = useState<SubmenuState>(null);
  const isOverSubmenuRef = useRef<boolean>(false);

  useEffect(() => {
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
    const rect = triggerElement.getBoundingClientRect();
    const submenuPosition: MenuPosition = {
      x: rect.right + 4,
      y: rect.top,
    };

    setSubmenuState({ item, position: submenuPosition });
  };

  const handleItemEnter = (item: MenuItem) => {
    if (item.type !== 'submenu') {
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

  return (
    <>
      <div
        ref={menuRef}
        className={styles.menu}
        style={{
          position: 'absolute',
          left: `${menuPosition.x}px`,
          top: `${menuPosition.y}px`,
        }}
      >
        {items.map((item, index) => (
          <MenuItemComponent
            key={index}
            item={item}
            onSubmenuOpen={handleSubmenuOpen}
            onItemEnter={handleItemEnter}
            activeSubmenu={submenuState?.item ?? null}
          />
        ))}
      </div>

      <Activity mode={submenuState !== null ? 'visible' : 'hidden'}>
        {submenuState !== null ? (
          <div
            onPointerEnter={handleSubmenuPointerEnter}
            onPointerLeave={handleSubmenuPointerLeave}
          >
            <Submenu
              items={submenuState.item.items}
              position={submenuState.position}
              onClose={onClose}
            />
          </div>
        ) : null}
      </Activity>
    </>
  );
};
