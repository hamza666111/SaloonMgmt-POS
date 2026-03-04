// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from calculate-payroll edge function!")

serve(async (req: any) => {
  try {
    // Check method
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { staff_id, period_start, period_end } = await req.json()

    if (!staff_id || !period_start || !period_end) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      })
    }

    // Step 1: Calculate Service Earnings based on staff commission
    const { data: sales, error: salesError } = await supabaseClient
      .from('sales')
      .select('*, sale_items(*)')
      .eq('staff_id', staff_id)
      .gte('created_at', period_start)
      .lte('created_at', period_end)
      .eq('status', 'paid')

    if (salesError) throw salesError

    let serviceEarnings = 0
    let tips = 0
    let productCommission = 0

    // Typical calculation
    sales.forEach((sale: any) => {
      tips += Number(sale.tip || 0)
      
      sale.sale_items.forEach((item: any) => {
        if (item.item_type === 'service') {
          serviceEarnings += (Number(item.price) * Number(item.quantity)) * (Number(item.commission_percent) / 100)
        } else if (item.item_type === 'product') {
          productCommission += (Number(item.price) * Number(item.quantity)) * (Number(item.commission_percent) / 100)
        }
      })
    })

    const total = serviceEarnings + tips + productCommission;

    return new Response(
      JSON.stringify({ 
        staff_id, 
        period_start, 
        period_end,
        serviceEarnings,
        tips,
        productCommission,
        total
      }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    })
  }
})
