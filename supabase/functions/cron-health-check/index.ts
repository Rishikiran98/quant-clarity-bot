/**
 * Cron job to monitor system health and send alerts
 * Runs every 5 minutes to check v_system_health view
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

interface SystemHealth {
  status: string;
  requests_1min: number;
  requests_5min: number;
  errors_5min: number;
  avg_latency_5min: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendSlackAlert(health: SystemHealth) {
  if (!SLACK_WEBHOOK_URL) {
    console.warn("SLACK_WEBHOOK_URL not configured, skipping alert");
    return;
  }

  const color = health.status === 'down' ? '#dc2626' : '#f59e0b';
  const emoji = health.status === 'down' ? '🔴' : '⚠️';
  
  const message = {
    text: `${emoji} System Health Alert: ${health.status.toUpperCase()}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${emoji} System Health: ${health.status.toUpperCase()}`,
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Requests (1min):*\n${health.requests_1min || 0}`
          },
          {
            type: "mrkdwn",
            text: `*Requests (5min):*\n${health.requests_5min || 0}`
          },
          {
            type: "mrkdwn",
            text: `*Errors (5min):*\n${health.errors_5min || 0}`
          },
          {
            type: "mrkdwn",
            text: `*Avg Latency:*\n${health.avg_latency_5min || 0}ms`
          }
        ]
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Timestamp: ${new Date().toISOString()}`
          }
        ]
      }
    ],
    attachments: [
      {
        color: color,
        fields: [
          {
            title: "Status",
            value: health.status,
            short: true
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error("Failed to send Slack alert:", await response.text());
    } else {
      console.log("Slack alert sent successfully");
    }
  } catch (error) {
    console.error("Error sending Slack alert:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Query system health view
    const { data: healthData, error: healthError } = await supabase
      .from('v_system_health')
      .select('*')
      .single();

    if (healthError) {
      console.error("Error querying system health:", healthError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to query system health",
          details: healthError.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const health = healthData as SystemHealth;
    console.log("System health:", health);

    // Send alert if system is degraded or down
    if (health.status === 'degraded' || health.status === 'down') {
      await sendSlackAlert(health);
    }

    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        health,
        duration_ms: duration,
        alert_sent: health.status === 'degraded' || health.status === 'down'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Unexpected error in health check:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
