export type MenuItemAction = {
  type: 'action';
  label: string;
  icon?: string;
  disabled?: boolean;
  shortcut?: string;
  onClick: () => void;
};

export type MenuItemSubmenu = {
  type: 'submenu';
  label: string;
  icon?: string;
  disabled?: boolean;
  items: MenuItem[];
};

export type MenuItemSeparator = {
  type: 'separator';
};

export type MenuItem = MenuItemAction | MenuItemSubmenu | MenuItemSeparator;

export type MenuPosition = {
  x: number;
  y: number;
};

export type ContextMenuProps = {
  items: MenuItem[];
  position: MenuPosition | null;
  onClose: () => void;
};
