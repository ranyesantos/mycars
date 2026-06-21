import { api } from './api'

/** Matches the backend's SpecsRow, keeping snake_case from the JSON response. */
export interface SpecsData {
  sourceUrl: string
  scrapedAt: string
  year: string | null
  fuel: string | null
  configuration: string | null
  warranty: string | null
  generation: string | null
  seats: string | null
  platform: string | null
  doors: string | null
  size: string | null
  origin: string | null
  propulsion: string | null
  series: string | null
  acceleration_0_100: string | null
  top_speed_g: string | null
  top_speed_e: string | null
  weight_power_ratio: string | null
  weight_torque_ratio: string | null
  specific_power: string | null
  specific_torque: string | null
  engine_code: string | null
  unit_displacement: string | null
  displacement: string | null
  bore: string | null
  stroke: string | null
  cylinders: string | null
  cylinders_arrangement: string | null
  valves_per_cylinder: string | null
  valve_control: string | null
  valve_variation: string | null
  tappets: string | null
  aspiration: string | null
  feeding: string | null
  installation: string | null
  arrangement: string | null
  compression_ratio: string | null
  drive_actuation: string | null
  power_hp_g: string | null
  power_hp_e: string | null
  max_power_rpm: string | null
  torque_g: string | null
  torque_e: string | null
  max_torque_rpm: string | null
  coupling: string | null
  gearbox: string | null
  gearbox_code: string | null
  gears: string | null
  traction: string | null
  height: string | null
  width: string | null
  length: string | null
  wheelbase: string | null
  front_track: string | null
  rear_track: string | null
  weight: string | null
  payload: string | null
  trunk_capacity: string | null
  fuel_tank: string | null
  front_brakes: string | null
  rear_brakes: string | null
  sidewall_height: string | null
  frontal_area: string | null
  corrected_frontal_area: string | null
  drag_coefficient: string | null
  steering_assist: string | null
  turning_diameter: string | null
  front_suspension: string | null
  rear_suspension: string | null
  elastic_element: string | null
  city_consumption_g: string | null
  highway_consumption_g: string | null
  city_range_g: string | null
  highway_range_g: string | null
  city_consumption_e: string | null
  highway_consumption_e: string | null
  city_range_e: string | null
  highway_range_e: string | null
}

export interface VehicleSpecsResponse {
  fipeCode: string
  vehicleType: string
  yearCode: string
  brand: string | null
  model: string | null
  year: string
  fuel: string | null
  price: string | null
  specs: SpecsData | null
}

export async function getVehicleSpecs(
  fipeCode: string,
  yearCode: string,
): Promise<VehicleSpecsResponse> {
  const response = await api.get(`/api/vehicles/${fipeCode}/${yearCode}/specs`)
  return response.data.data
}
