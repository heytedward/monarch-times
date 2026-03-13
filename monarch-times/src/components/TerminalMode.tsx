import { useEffect, useState } from 'react';

export const TerminalMode = () => {
    const [logStream, setLogStream] = useState<string>('Initializing Monarch OS Terminal Mode...\n');

    useEffect(() => {
        // We override the body background for this specific route
        document.body.style.backgroundColor = '#000000';
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        let isMounted = true;

        const fetchSystemState = async () => {
            try {
                if (!isMounted) return;
                setLogStream(prev => prev + '> Fetching active agent protocols...\n');
                const agentsRes = await fetch('/api/agents');
                if (!agentsRes.ok) {
                    throw new Error(`API returned ${agentsRes.status}`);
                }
                const agentsContentType = agentsRes.headers.get('content-type');
                if (!agentsContentType || !agentsContentType.includes('application/json')) {
                    throw new Error(`Expected JSON, received HTML (Vite proxy fallback). Is the Vercel backend running?`);
                }
                const agentsData = await agentsRes.json();

                if (!isMounted) return;
                setLogStream(prev => prev + `[OK] Retrieved ${agentsData.agents?.length || 0} agents.\n\n`);

                setLogStream(prev => prev + '> Fetching system heartbeat...\n');
                const sysRes = await fetch('/api/system?format=json');
                if (!sysRes.ok) {
                    throw new Error(`API returned ${sysRes.status}`);
                }
                const sysContentType = sysRes.headers.get('content-type');
                if (!sysContentType || !sysContentType.includes('application/json')) {
                    throw new Error(`Expected JSON, received HTML (Vite proxy fallback). Is the Vercel backend running?`);
                }
                const sysData = await sysRes.json();

                if (!isMounted) return;
                setLogStream(prev => prev + `[OK] Heartbeat synced. Active Intel: ${sysData.stats?.total_intel || 0}\n\n`);

                // Construct a raw JSON representation of the entire state
                const combinedState = {
                    timestamp: new Date().toISOString(),
                    network_status: sysData.stats,
                    active_nodes: agentsData.agents?.map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        status: a.status,
                        specialty: a.identity
                    })),
                    recent_activity: sysData.recentIntel,
                    metrics: {
                        topic_distribution: sysData.topicActivity,
                        node_uptime: "99.999%"
                    }
                };

                setLogStream(prev => prev + '> Streaming raw protocol state:\n');
                setLogStream(prev => prev + '--------------------------------------------------\n');
                setLogStream(prev => prev + JSON.stringify(combinedState, null, 2) + '\n');
                setLogStream(prev => prev + '--------------------------------------------------\n');
                setLogStream(prev => prev + '> STREAM END. AWAITING NEW DIRECTIVES...\n');

            } catch (err: any) {
                if (isMounted) {
                    setLogStream(prev => prev + `[ERROR] Connection refused: ${err.message}\n`);
                }
            }
        };

        fetchSystemState();

        return () => {
            isMounted = false;
            // Restore default body background on unmount just in case
            document.body.style.backgroundColor = '';
        };
    }, []);

    return (
        <pre style={{
            margin: 0,
            padding: '20px',
            backgroundColor: '#000000',
            color: '#00FF00',
            fontFamily: 'monospace, "Courier New", Courier',
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            minHeight: '100vh',
            boxSizing: 'border-box'
        }}>
            {logStream}
        </pre>
    );
};
