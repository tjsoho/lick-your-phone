"use client";

import React, { useState } from "react";
import { cn } from "../../utils/cn";

interface EditableElementProps {
	as?: 'input' | 'textarea' | 'p' | 'h2' | 'span' | 'button';
	className?: string;
	defaultValue?: string;
	onTextChange?: (newText: string) => void;
	style?: React.CSSProperties;
	onInput?: (e: React.FormEvent<HTMLTextAreaElement>) => void;
}

export const EditableElement = React.forwardRef<
	HTMLElement,
	EditableElementProps
>(
	(
		{ as: Component = "input", className, defaultValue = '', onTextChange, style, onInput },
		ref,
	) => {
		const ComponentType = Component as React.ElementType;
		const [isHovered, setIsHovered] = useState(false);
		const [isEditing, setIsEditing] = useState(false);
		const [text, setText] = useState(defaultValue);

		const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			setText(e.target.value);
			onTextChange?.(e.target.value);
		};

		if (Component === 'textarea') {
			return (
				<div className="relative group">
					<textarea
						ref={ref as React.Ref<HTMLTextAreaElement>}
						className={cn("w-full outline-none bg-transparent", className)}
						value={text}
						onChange={handleTextChange}
						onInput={onInput}
						style={style}
					/>
				</div>
			);
		}

		if (Component === 'input') {
			return (
				<div className="relative group">
					<input
						ref={ref as React.Ref<HTMLInputElement>}
						type="text"
						className={cn("w-full outline-none bg-transparent", className)}
						value={text}
						onChange={handleTextChange}
					/>
				</div>
			);
		}

		// For other elements (p, h2, span, button)
		return (
			<div className="relative group">
				<ComponentType
					ref={ref as React.Ref<HTMLElement>}
					className={cn("w-full outline-none bg-transparent", className)}
					onClick={() => setIsEditing(true)}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
				>
					{isEditing ? (
						<input
							type="text"
							value={text}
							onChange={handleTextChange}
							onBlur={() => setIsEditing(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									setIsEditing(false);
								}
							}}
							className="w-full outline-none bg-transparent"
							autoFocus
						/>
					) : (
						text
					)}
				</ComponentType>
				{isHovered && !isEditing && (
					<div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
						Click to edit
					</div>
				)}
			</div>
		);
	},
);

EditableElement.displayName = "EditableElement";
