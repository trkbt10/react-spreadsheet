/**
 * @file Catalog page for demonstrating UI components.
 */

import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";
import { FiScissors, FiCopy, FiClipboard, FiTrash2 } from "react-icons/fi";
import { MdFormatColorText } from "react-icons/md";
import { ContextMenu } from "../components/layouts/ContextMenu";
import type { MenuItem, MenuPosition } from "../components/layouts/ContextMenu.types";
import { FormulaFunctionInput } from "../components/sheets/cell-input";
import styles from "./Catalog.module.css";

/**
 * Catalog page component for testing and demonstrating components.
 */
export function Catalog(): ReactElement {
  const [contextMenuPosition, setContextMenuPosition] = useState<MenuPosition | null>(null);
  const [formulaValue, setFormulaValue] = useState<string>("=");

  const handleFormulaChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFormulaValue(event.target.value);
  }, []);

  const contextMenuItems: MenuItem[] = [
    {
      type: "action",
      label: "Cut",
      icon: <FiScissors />,
      shortcut: "⌘X",
      onClick: () => {
        console.log("Cut clicked");
        setContextMenuPosition(null);
      },
    },
    {
      type: "action",
      label: "Copy",
      icon: <FiCopy />,
      shortcut: "⌘C",
      onClick: () => {
        console.log("Copy clicked");
        setContextMenuPosition(null);
      },
    },
    {
      type: "action",
      label: "Paste",
      icon: <FiClipboard />,
      shortcut: "⌘V",
      onClick: () => {
        console.log("Paste clicked");
        setContextMenuPosition(null);
      },
    },
    {
      type: "separator",
    },
    {
      type: "submenu",
      label: "Format",
      icon: <MdFormatColorText />,
      items: [
        {
          type: "action",
          label: "Bold",
          shortcut: "⌘B",
          onClick: () => {
            console.log("Bold clicked");
            setContextMenuPosition(null);
          },
        },
        {
          type: "action",
          label: "Italic",
          shortcut: "⌘I",
          onClick: () => {
            console.log("Italic clicked");
            setContextMenuPosition(null);
          },
        },
        {
          type: "separator",
        },
        {
          type: "submenu",
          label: "Text Color",
          items: [
            {
              type: "action",
              label: "Red",
              onClick: () => {
                console.log("Red clicked");
                setContextMenuPosition(null);
              },
            },
            {
              type: "action",
              label: "Blue",
              onClick: () => {
                console.log("Blue clicked");
                setContextMenuPosition(null);
              },
            },
            {
              type: "action",
              label: "Green",
              onClick: () => {
                console.log("Green clicked");
                setContextMenuPosition(null);
              },
            },
            {
              type: "submenu",
              label: "Custom Colors",
              items: [
                {
                  type: "action",
                  label: "Orange",
                  onClick: () => {
                    console.log("Orange clicked");
                    setContextMenuPosition(null);
                  },
                },
                {
                  type: "action",
                  label: "Purple",
                  onClick: () => {
                    console.log("Purple clicked");
                    setContextMenuPosition(null);
                  },
                },
                {
                  type: "submenu",
                  label: "Gradients",
                  items: [
                    {
                      type: "action",
                      label: "Sunset",
                      onClick: () => {
                        console.log("Sunset gradient clicked");
                        setContextMenuPosition(null);
                      },
                    },
                    {
                      type: "action",
                      label: "Ocean",
                      onClick: () => {
                        console.log("Ocean gradient clicked");
                        setContextMenuPosition(null);
                      },
                    },
                    {
                      type: "action",
                      label: "Forest",
                      onClick: () => {
                        console.log("Forest gradient clicked");
                        setContextMenuPosition(null);
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "submenu",
          label: "Background Color",
          items: [
            {
              type: "action",
              label: "Yellow",
              onClick: () => {
                console.log("Yellow background clicked");
                setContextMenuPosition(null);
              },
            },
            {
              type: "action",
              label: "Cyan",
              onClick: () => {
                console.log("Cyan background clicked");
                setContextMenuPosition(null);
              },
            },
            {
              type: "action",
              label: "Magenta",
              onClick: () => {
                console.log("Magenta background clicked");
                setContextMenuPosition(null);
              },
            },
          ],
        },
      ],
    },
    {
      type: "separator",
    },
    {
      type: "action",
      label: "Delete",
      icon: <FiTrash2 />,
      shortcut: "⌫",
      onClick: () => {
        console.log("Delete clicked");
        setContextMenuPosition(null);
      },
    },
    {
      type: "action",
      label: "Disabled Item",
      disabled: true,
      onClick: () => {
        console.log("This should not be called");
      },
    },
  ];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Component Catalog</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Context Menu</h2>
        <div className={styles.demoArea} onContextMenu={handleContextMenu}>
          <p className={styles.instruction}>Right-click anywhere in this area to open the context menu</p>
          <ul className={styles.featureList}>
            <li>Native-like appearance and behavior</li>
            <li>4-level nested submenu support (Format → Text Color → Custom Colors → Gradients)</li>
            <li>React 19 Activity component for visibility control</li>
            <li>Pointer events instead of mouse events</li>
            <li>Automatic positioning within viewport boundaries</li>
            <li>Keyboard shortcuts display</li>
            <li>Disabled menu items</li>
            <li>Icons and separators</li>
          </ul>
        </div>
      </section>

      <ContextMenu
        items={contextMenuItems}
        position={contextMenuPosition}
        onClose={() => {
          setContextMenuPosition(null);
        }}
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Formula Function Input</h2>
        <div className={styles.formulaDemo}>
          <p className={styles.formulaDescription}>Type "=" followed by a name to explore registered functions.</p>
          <div className={styles.formulaPreview}>
            <FormulaFunctionInput
              value={formulaValue}
              onChange={handleFormulaChange}
              className={styles.formulaInput}
              type="text"
              placeholder="Enter a formula"
            />
            <span className={styles.formulaValueLabel}>Current value:</span>
            <code className={styles.formulaValue}>{formulaValue}</code>
          </div>
        </div>
      </section>
    </div>
  );
}
