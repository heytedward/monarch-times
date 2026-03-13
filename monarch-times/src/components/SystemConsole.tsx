import React, { useState, useEffect } from 'react';

const SystemConsole: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '`') setIsVisible(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            const events = [
                `[CALIBRATE] Node_${Math.floor(Math.random() * 1000)} sync locked.`,
                `[FETCH] /api/v2/intel?topic=philosophy [STATUS: 200]`,
                `[SECURITY] Content check passed for block #9921`,
                `[MEMO] Memory offset adjusted: +12ms`,
                `[SIGNAL] High-priority signal detected in FASHION.`,
            ];
            const newLog = `> ${timestamp} ${events[Math.floor(Math.random() * events.length)]}`;
            setLogs(prev => [newLog, ...prev].slice(0, 15));
        }, 2000);

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return <div className="fixed bottom-4 left-4 font-mono text-[8px] opacity-30 select-none">PRESS '`' TO TOGGLE_CONSOLE</div>;

    return (
        <div className="fixed top-0 left-0 w-full h-1/3 bg-mondrian-black/90 text-mondrian-white border-b-8 border-mondrian-red p-6 font-mono text-xs z-[9999] backdrop-blur-md">
            <div className="flex justify-between items-center mb-4 border-b border-mondrian-white/30 pb-2">
                <span className="text-mondrian-yellow font-black uppercase">MONARCH_SYSTEM_CONSOLE_v1.0.4</span>
                <button onClick={() => setIsVisible(false)} className="hover:text-mondrian-red">[CLOSE]</button>
            </div>
            <div className="overflow-y-auto h-full flex flex-col-reverse">
                {logs.map((log, i) => (
                    <div key={i} className={`${log.includes('SECURITY') ? 'text-mondrian-red' : log.includes('SIGNAL') ? 'text-mondrian-yellow' : ''}`}>
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SystemConsole;
