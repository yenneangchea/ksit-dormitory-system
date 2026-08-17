import type { UtilityBill } from '@/types';

function formatValue(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(Number(value || 0));
}

export function UtilitySubsidyBreakdown({ bill, compact = false }: { bill?: UtilityBill | null; compact?: boolean }) {
  if (!bill) return <p className="mt-2 text-xs text-[#68736c]">The utility breakdown is not available for this legacy invoice.</p>;
  if (!bill.subsidy_applied) return <p className="mt-2 text-xs text-[#68736c]">This invoice was generated before Smart Utility Subsidies were enabled.</p>;

  return <div className={`rounded-xl border border-[#dce8de] bg-[#fafcf9] text-sm text-[#365044] ${compact ? 'mt-3 p-3' : 'mt-4 p-4'}`}>
    <p className="font-bold text-[#20342a]">Smart subsidy calculation</p>
    <div className="mt-2 space-y-1.5 text-xs leading-5 sm:text-sm">
      <p><b>Electricity:</b> {formatValue(bill.electricity_used_kwh)} kWh − {formatValue(bill.subsidized_electricity_kwh)} kWh free = {formatValue(bill.chargeable_electricity_kwh)} kWh × {formatValue(bill.electric_rate_khr, 0)}៛ = <b>៛ {formatValue(bill.total_electric_cost_khr, 0)}</b></p>
      <p><b>Water:</b> {formatValue(bill.water_used_m3)} m³ − {formatValue(bill.subsidized_water_m3)} m³ free = {formatValue(bill.chargeable_water_m3)} m³ × {formatValue(bill.water_rate_khr, 0)}៛ = <b>៛ {formatValue(bill.total_water_cost_khr, 0)}</b></p>
      <p><b>Trash fee:</b> ៛ {formatValue(bill.trash_fee_khr, 0)}</p>
      <p className="border-t border-[#dce8de] pt-2 text-[#173d25]"><b>Room total:</b> ៛ {formatValue(bill.total_amount_khr, 0)} ÷ {bill.active_students_count} student{bill.active_students_count === 1 ? '' : 's'} = <b>៛ {formatValue(bill.split_amount_per_student_khr, 0)} per student</b></p>
    </div>
  </div>;
}
