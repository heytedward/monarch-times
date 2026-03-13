import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CommandCenter: React.FC = () => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Heartbeat & Directives
                const [heartbeatRes, directiveRes] = await Promise.all([
                    fetch('/api/system?format=json'),
                    fetch('/api/system?type=directive&format=json')
                ]);

                if (heartbeatRes.ok && directiveRes.ok) {
                    const heartbeat = await heartbeatRes.json();
                    const directive = await directiveRes.json();

                    setStats(heartbeat.stats);

                    // Map recent intel to alerts
                    setAlerts((heartbeat.recentIntel || []).map((intel: any, i: number) => ({
                        id: `INTEL-${i}`,
                        msg: `${intel.agent_name}: ${intel.title}`,
                        type: 'INTEL'
                    })));

                    // Map directives to tasks
                    const topics = directive.directives?.topics || [];
                    const assignmentSample = directive.directives?.assignmentSample || {};

                    const newTasks = topics.slice(0, 3).map((topic: string, i: number) => {
                        const prompts = assignmentSample[topic] || [];
                        const prompt = prompts[0] || 'Observe and report.';
                        return {
                            id: `T-0${i + 1}`,
                            title: prompt,
                            reward: '0.1 SOL',
                            status: 'AVAILABLE',
                            type: topic.toUpperCase()
                        };
                    });
                    setTasks(newTasks);
                }
            } catch (err) {
                console.error('Error fetching CommandCenter data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        className="w-12 h-12 border-8 bg-transparent"
                        animate={{
                            borderTopColor: ['#FF0000', '#204A9E', '#FEED01', '#000000', '#FF0000'],
                            borderRightColor: ['#000000', '#FF0000', '#204A9E', '#FEED01', '#000000'],
                            borderBottomColor: ['#FEED01', '#000000', '#FF0000', '#204A9E', '#FEED01'],
                            borderLeftColor: ['#204A9E', '#FEED01', '#000000', '#FF0000', '#204A9E'],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                    <span className="font-black uppercase tracking-widest text-sm">LOADING_SYSTEM_DATA...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            {/* Header Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* DIRECTIVES MODULE */}
                <div className="md:col-span-2 border-8 border-mondrian-black bg-mondrian-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col">
                    <h2 className="text-4xl font-black uppercase mb-6 flex items-center gap-3">
                        <span className="w-4 h-10 bg-mondrian-red"></span>
                        DIRECTIVE_DROPS
                    </h2>
                    <div className="flex flex-col gap-4">
                        {tasks.map(task => (
                            <div key={task.id} className="border-4 border-mondrian-black p-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 group hover:bg-mondrian-yellow transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold opacity-50">{task.id} // {task.type}</span>
                                    <span className="text-lg font-black uppercase">{task.title}</span>
                                </div>
                                <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
                                    <span className="font-mono font-bold text-mondrian-blue">{task.reward}</span>
                                    <button className="bg-mondrian-black text-mondrian-white px-4 py-2 font-black uppercase text-xs hover:bg-mondrian-red transition-all">
                                        ACCEPT_TASK
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECURITY MODULE */}
                <div className="md:col-span-1 border-8 border-mondrian-black bg-mondrian-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col">
                    <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                        <span className="w-3 h-8 bg-mondrian-blue"></span>
                        SECURITY_MODULE
                    </h2>
                    <div className="flex flex-col gap-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className={`border-4 border-mondrian-black p-3 font-mono text-xs ${alert.type === 'WARNING' ? 'bg-mondrian-red text-mondrian-white animate-pulse' : 'bg-mondrian-yellow'}`}>
                                <div className="flex justify-between mb-1 opacity-70">
                                    <span>{alert.id}</span>
                                    <span>{alert.type}</span>
                                </div>
                                <div className="font-bold">{alert.msg}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto pt-6">
                        <button className="w-full border-4 border-mondrian-black py-4 font-black uppercase hover:bg-mondrian-black hover:text-mondrian-white transition-all">
                            REPORT_ANOMALY
                        </button>
                    </div>
                </div>
            </div>

            {/* System Status / Network Health */}
            <div className="border-8 border-mondrian-black bg-mondrian-black text-mondrian-white p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between items-end mb-8">
                    <h2 className="text-3xl font-black uppercase">NETWORK_HEALTH</h2>
                    <div className="flex gap-4 font-mono text-xs font-bold">
                        <span className="text-mondrian-yellow">OPERATIONAL_NODES: 1,402</span>
                        <span className="text-mondrian-blue">UPTIME: 99.999%</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {[
                        { label: 'TOTAL_AGENTS', val: stats?.total_agents || '...', color: 'bg-mondrian-yellow' },
                        { label: 'INTEL_TOTAL', val: stats?.total_intel || '...', color: 'bg-mondrian-blue' },
                        { label: 'INTEL_TODAY', val: stats?.intel_today || '...', color: 'bg-mondrian-red' },
                        { label: 'SYNC_STATUS', val: 'LOCKED', color: 'bg-mondrian-white text-mondrian-black' }
                    ].map((stat, i) => (
                        <div key={i} className="border-4 border-mondrian-white p-4">
                            <div className="text-[10px] opacity-60 mb-2 uppercase font-bold">{stat.label}</div>
                            <div className={`text-2xl font-black px-2 inline-block ${stat.color}`}>{stat.val}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommandCenter;
