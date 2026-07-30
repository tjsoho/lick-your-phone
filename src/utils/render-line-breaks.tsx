/* ************************************************************
                        NOTES
************************************************************ */
// Utility function to render text with line breaks
// Converts \n characters to <br> elements for proper rendering
/* ************************************************************
                        IMPORTS
************************************************************ */
import React from 'react';

/* ************************************************************
                        INTERFACES
************************************************************ */
interface RenderLineBreaksProps {
    text: string;
    className?: string;
}

/* ************************************************************
                        COMPONENTS
************************************************************ */
export function RenderLineBreaks({ text }: RenderLineBreaksProps) {
    if (!text) return null;

    // Split text by line breaks and render each part
    const lines = text.split('\n');

    return (
        <>
            {lines.map((line, index) => (
                <React.Fragment key={index}>
                    {line}
                    {index < lines.length - 1 && <br />}
                </React.Fragment>
            ))}
        </>
    );
}

/* ************************************************************
                        EXPORTS
************************************************************ */
export default RenderLineBreaks;
