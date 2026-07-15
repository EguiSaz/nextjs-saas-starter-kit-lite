/*
 * -------------------------------------------------------
 * GestorPro — Módulo 7: Generación automática de renta (cron)
 *
 * Función idempotente generar_cargos_renta() + agendado pg_cron mensual.
 * La idempotencia la garantiza el índice único (contrato_id, categoria, periodo)
 * de transacciones (regla #7): correr el proceso dos veces no duplica cargos.
 *
 * Depende de Módulo 3 (contratos, transacciones).
 * -------------------------------------------------------
 */

/* =========================================================
 * Section: Función de generación de cargos de renta
 * p_periodo = 'YYYY-MM'. Si p_organization_id es NULL -> todas las orgs (cron);
 * si se pasa -> solo esa org, validando permiso (disparo manual del usuario).
 * ======================================================= */
create or replace function public.generar_cargos_renta(
    p_periodo text,
    p_organization_id uuid default null
)
    returns integer
    language plpgsql
    security definer
    set search_path = ''
as $$
declare
    v_count integer := 0;
    v_first date := to_date(p_periodo || '-01', 'YYYY-MM-DD');
    v_last  date := (to_date(p_periodo || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day')::date;
    r       record;
begin
    -- Disparo manual (org específica): validar permiso
    if p_organization_id is not null then
        if not public.has_permission(p_organization_id, 'transacciones.manage') then
            raise exception 'No autorizado';
        end if;
    end if;

    for r in
        select c.id, c.organization_id, c.renta_mensual, c.dia_pago
        from public.contratos c
        where c.estado = 'activo'
          and c.fecha_inicio <= v_last
          and c.fecha_fin >= v_first
          and (p_organization_id is null or c.organization_id = p_organization_id)
    loop
        insert into public.transacciones
            (organization_id, contrato_id, tipo, categoria, concepto, monto, fecha, periodo)
        values
            (r.organization_id, r.id, 'cargo', 'renta',
             'Renta ' || p_periodo, r.renta_mensual,
             make_date(
                 extract(year from v_first)::int,
                 extract(month from v_first)::int,
                 least(r.dia_pago, extract(day from v_last)::int)
             ),
             p_periodo)
        on conflict (contrato_id, categoria, periodo)
            where periodo is not null do nothing;

        if found then
            v_count := v_count + 1;
        end if;
    end loop;

    return v_count;
end;
$$;

grant execute on function public.generar_cargos_renta(text, uuid) to authenticated, service_role;

/* =========================================================
 * Section: Agendado con pg_cron
 * Día 1 de cada mes a las 06:00 (hora del servidor de la BD),
 * genera la renta del mes en curso para TODAS las organizaciones.
 * ======================================================= */
create extension if not exists pg_cron;

-- Reprogramable de forma idempotente por nombre de job
select cron.schedule(
    'gestorpro-cargos-mensuales',
    '0 6 1 * *',
    $$select public.generar_cargos_renta(to_char(now(), 'YYYY-MM'))$$
);
