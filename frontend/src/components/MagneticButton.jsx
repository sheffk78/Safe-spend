import React, { useRef, useState, useEffect } from 'react';

const MagneticButton = ({ children, className = '', strength = 0.3, ...props }) => {
    const ref = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left - rect.width / 2) * strength;
        const y = (e.clientY - rect.top - rect.height / 2) * strength;
        setPosition({ x, y });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="inline-block"
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: position.x === 0 && position.y === 0 
                    ? 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)' 
                    : 'transform 0.15s ease-out',
            }}
        >
            <div className={className} {...props}>
                {children}
            </div>
        </div>
    );
};

export default MagneticButton;