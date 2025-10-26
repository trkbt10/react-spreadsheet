/**
 * @file Toolbar component for cell formatting controls.
 */

import { useCallback } from "react";
import type { ReactElement, MouseEvent } from "react";
import { FaBold, FaItalic, FaUnderline, FaStrikethrough, FaPalette, FaFillDrip } from "react-icons/fa";
import { ToolbarButton } from "./ToolbarButton";
import { ToolbarDivider } from "./ToolbarDivider";
import { ColorPicker } from "./ColorPicker";
import { FontSizeSelect } from "./FontSizeSelect";
import { FontFamilySelect } from "./FontFamilySelect";
import styles from "./Toolbar.module.css";

export type ToolbarStyle = {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: boolean;
  readonly strikethrough?: boolean;
  readonly fontSize?: string;
  readonly fontFamily?: string;
  readonly color?: string;
  readonly backgroundColor?: string;
};

export type ToolbarProps = {
  readonly currentStyle: ToolbarStyle;
  readonly onStyleChange: (style: ToolbarStyle) => void;
  readonly isDisabled?: boolean;
};

/**
 * Toolbar component for formatting cell content with Notion-style design.
 * @param props - Toolbar props
 * @returns Toolbar component
 */
export const Toolbar = ({ currentStyle, onStyleChange, isDisabled = false }: ToolbarProps): ReactElement => {
  const handleBoldClick = useCallback(
    (_event: MouseEvent<HTMLButtonElement>) => {
      onStyleChange({ ...currentStyle, bold: !currentStyle.bold });
    },
    [currentStyle, onStyleChange],
  );

  const handleItalicClick = useCallback(
    (_event: MouseEvent<HTMLButtonElement>) => {
      onStyleChange({ ...currentStyle, italic: !currentStyle.italic });
    },
    [currentStyle, onStyleChange],
  );

  const handleUnderlineClick = useCallback(
    (_event: MouseEvent<HTMLButtonElement>) => {
      onStyleChange({ ...currentStyle, underline: !currentStyle.underline });
    },
    [currentStyle, onStyleChange],
  );

  const handleStrikethroughClick = useCallback(
    (_event: MouseEvent<HTMLButtonElement>) => {
      onStyleChange({ ...currentStyle, strikethrough: !currentStyle.strikethrough });
    },
    [currentStyle, onStyleChange],
  );

  const handleFontSizeChange = useCallback(
    (fontSize: string) => {
      onStyleChange({ ...currentStyle, fontSize });
    },
    [currentStyle, onStyleChange],
  );

  const handleFontFamilyChange = useCallback(
    (fontFamily: string) => {
      onStyleChange({ ...currentStyle, fontFamily });
    },
    [currentStyle, onStyleChange],
  );

  const handleColorChange = useCallback(
    (color: string) => {
      onStyleChange({ ...currentStyle, color });
    },
    [currentStyle, onStyleChange],
  );

  const handleBackgroundColorChange = useCallback(
    (backgroundColor: string) => {
      onStyleChange({ ...currentStyle, backgroundColor });
    },
    [currentStyle, onStyleChange],
  );

  return (
    <div className={styles.toolbar} data-is-disabled={isDisabled}>
      <ToolbarButton
        icon={<FaBold />}
        onClick={handleBoldClick}
        isActive={currentStyle.bold ?? false}
        isDisabled={isDisabled}
        ariaLabel="Bold"
      />
      <ToolbarButton
        icon={<FaItalic />}
        onClick={handleItalicClick}
        isActive={currentStyle.italic ?? false}
        isDisabled={isDisabled}
        ariaLabel="Italic"
      />
      <ToolbarButton
        icon={<FaUnderline />}
        onClick={handleUnderlineClick}
        isActive={currentStyle.underline ?? false}
        isDisabled={isDisabled}
        ariaLabel="Underline"
      />
      <ToolbarButton
        icon={<FaStrikethrough />}
        onClick={handleStrikethroughClick}
        isActive={currentStyle.strikethrough ?? false}
        isDisabled={isDisabled}
        ariaLabel="Strikethrough"
      />

      <ToolbarDivider />

      <FontSizeSelect value={currentStyle.fontSize ?? "14"} onChange={handleFontSizeChange} />

      <FontFamilySelect
        value={currentStyle.fontFamily ?? "var(--font-family-base)"}
        onChange={handleFontFamilyChange}
      />

      <ToolbarDivider />

      <ColorPicker
        value={currentStyle.color ?? "#000000"}
        onChange={handleColorChange}
        icon={<FaPalette />}
        ariaLabel="Text color"
      />

      <ColorPicker
        value={currentStyle.backgroundColor ?? "#ffffff"}
        onChange={handleBackgroundColorChange}
        icon={<FaFillDrip />}
        ariaLabel="Background color"
      />
    </div>
  );
};
