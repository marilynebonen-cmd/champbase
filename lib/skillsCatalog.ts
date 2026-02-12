/**
 * Catalogue des compétences et mouvements (chartes).
 * Chaque mouvement: id (slug stable), name, categoryId, order (easy → hard).
 */

export type SkillCategoryId =
  | "squats"
  | "single_leg_squats"
  | "jumping"
  | "hip_trunk_flexion"
  | "hip_trunk_extension"
  | "push_horizontal_away"
  | "push_vertical_away"
  | "push_horizontal_object"
  | "push_vertical_object"
  | "push_inverted_away"
  | "push_inverted_object_hespu"
  | "kettlebells"
  | "pull_floor_to_hip"
  | "pull_floor_to_shoulder"
  | "pull_floor_to_overhead"
  | "pull_to_object"
  | "rope_climb";

export type SkillCategory = {
  id: SkillCategoryId;
  name: string;
};

export type SkillMovement = {
  id: string;
  name: string;
  categoryId: SkillCategoryId;
  order: number;
};

export const SKILL_CATEGORIES: SkillCategory[] = [
  { id: "squats", name: "Squats" },
  { id: "single_leg_squats", name: "Single-Leg Squats" },
  { id: "jumping", name: "Jumping" },
  { id: "hip_trunk_flexion", name: "Hip & Trunk (Flexion / Core)" },
  { id: "hip_trunk_extension", name: "Hip & Trunk (Extension)" },
  { id: "push_horizontal_away", name: "Push Away (Horizontal)" },
  { id: "push_vertical_away", name: "Push Away (Vertical)" },
  { id: "push_horizontal_object", name: "Push Object Away (Horizontal)" },
  { id: "push_vertical_object", name: "Push Object Away (Vertical)" },
  { id: "push_inverted_away", name: "Push Inverted (Handstand)" },
  { id: "push_inverted_object_hespu", name: "Push Inverted (HeSPU)" },
  { id: "kettlebells", name: "Kettlebells" },
  { id: "pull_floor_to_hip", name: "Pull Object (Floor to Hip)" },
  { id: "pull_floor_to_shoulder", name: "Pull Object (Floor to Shoulder)" },
  { id: "pull_floor_to_overhead", name: "Pull Object (Floor to Overhead)" },
  { id: "pull_to_object", name: "Pull to Object" },
  { id: "rope_climb", name: "Rope Climb" },
];

/** IDs des 4 compétences affichées en preview sur le dashboard */
export const SKILL_PREVIEW_CATEGORY_IDS: SkillCategoryId[] = [
  "squats",
  "pull_to_object",
  "push_inverted_object_hespu",
  "kettlebells",
];

const MOVEMENTS: SkillMovement[] = [
  // Squats
  { id: "squats_box_squat", name: "Box Squat", categoryId: "squats", order: 1 },
  { id: "squats_air_squat", name: "Air Squat", categoryId: "squats", order: 2 },
  { id: "squats_dumbbell_squat", name: "Dumbbell Squat", categoryId: "squats", order: 3 },
  { id: "squats_back_squat", name: "Back Squat", categoryId: "squats", order: 4 },
  { id: "squats_front_squat", name: "Front Squat", categoryId: "squats", order: 5 },
  { id: "squats_overhead_squat", name: "Overhead Squat", categoryId: "squats", order: 6 },
  // Single-Leg Squats
  { id: "single_leg_walking_lunge", name: "Walking Lunge", categoryId: "single_leg_squats", order: 1 },
  { id: "single_leg_reverse_lunge", name: "Reverse Walking Lunge", categoryId: "single_leg_squats", order: 2 },
  { id: "single_leg_hanging_pistol_box", name: "Hanging Leg Pistol on Box", categoryId: "single_leg_squats", order: 3 },
  { id: "single_leg_elevated_pistol_box", name: "Elevated Leg Pistol on Box", categoryId: "single_leg_squats", order: 4 },
  { id: "single_leg_pistol", name: "Pistol", categoryId: "single_leg_squats", order: 5 },
  { id: "single_leg_weighted_pistol", name: "Weighted Pistol", categoryId: "single_leg_squats", order: 6 },
  // Jumping
  { id: "jumping_mechanics", name: "Jump-and-land Mechanics", categoryId: "jumping", order: 1 },
  { id: "jumping_broad", name: "Broad Jump", categoryId: "jumping", order: 2 },
  { id: "jumping_box", name: "Box Jump", categoryId: "jumping", order: 3 },
  // Hip & Trunk (Flexion / Core)
  { id: "hip_flex_butterfly_situp", name: "Butterfly Sit-up", categoryId: "hip_trunk_flexion", order: 1 },
  { id: "hip_flex_military_situp", name: "Feet-anchored Military Sit-up", categoryId: "hip_trunk_flexion", order: 2 },
  { id: "hip_flex_weighted_situp", name: "Weighted Sit-up", categoryId: "hip_trunk_flexion", order: 3 },
  { id: "hip_flex_roman_chair", name: "Roman Chair Sit-up", categoryId: "hip_trunk_flexion", order: 4 },
  { id: "hip_flex_ghd_situp", name: "GHD Sit-up", categoryId: "hip_trunk_flexion", order: 5 },
  { id: "hip_flex_ghd_medball", name: "GHD Medball Sit-up and Toss", categoryId: "hip_trunk_flexion", order: 6 },
  { id: "hip_flex_hollow_rock", name: "Hollow Rock", categoryId: "hip_trunk_flexion", order: 7 },
  { id: "hip_flex_tuck_crunch", name: "Tuck Crunch", categoryId: "hip_trunk_flexion", order: 8 },
  { id: "hip_flex_vups", name: "V-ups", categoryId: "hip_trunk_flexion", order: 9 },
  { id: "hip_flex_tuck_sit", name: "Tuck Sit", categoryId: "hip_trunk_flexion", order: 10 },
  { id: "hip_flex_lsit_knee_ext", name: "L-sit Knee Extensions", categoryId: "hip_trunk_flexion", order: 11 },
  { id: "hip_flex_lsit", name: "L-sit", categoryId: "hip_trunk_flexion", order: 12 },
  { id: "hip_flex_lsit_rings", name: "L-sit on Rings", categoryId: "hip_trunk_flexion", order: 13 },
  { id: "hip_flex_vsit", name: "V-sit", categoryId: "hip_trunk_flexion", order: 14 },
  { id: "hip_flex_supine_knee", name: "Supine Knee Draw", categoryId: "hip_trunk_flexion", order: 15 },
  { id: "hip_flex_hanging_knee", name: "Hanging Knee Raise", categoryId: "hip_trunk_flexion", order: 16 },
  { id: "hip_flex_knees_to_elbows", name: "Knees-to-elbows", categoryId: "hip_trunk_flexion", order: 17 },
  { id: "hip_flex_skin_the_cat", name: "Skin-the-cats", categoryId: "hip_trunk_flexion", order: 18 },
  { id: "hip_flex_toes_to_ceiling", name: "Toes-to-ceiling", categoryId: "hip_trunk_flexion", order: 19 },
  { id: "hip_flex_hanging_leg_raise", name: "Hanging Straight Leg Raise", categoryId: "hip_trunk_flexion", order: 20 },
  { id: "hip_flex_toes_to_bar", name: "Toes-to-bar", categoryId: "hip_trunk_flexion", order: 21 },
  { id: "hip_flex_kipping_t2b", name: "Kipping T2B", categoryId: "hip_trunk_flexion", order: 22 },
  // Hip & Trunk (Extension)
  { id: "hip_ext_good_morning", name: "Good Morning", categoryId: "hip_trunk_extension", order: 1 },
  { id: "hip_ext_hip_extension", name: "Hip Extension", categoryId: "hip_trunk_extension", order: 2 },
  { id: "hip_ext_back_extension", name: "Back Extension", categoryId: "hip_trunk_extension", order: 3 },
  { id: "hip_ext_hip_back", name: "Hip and Back Extension", categoryId: "hip_trunk_extension", order: 4 },
  { id: "hip_ext_glute_ham", name: "Glute Ham Raise", categoryId: "hip_trunk_extension", order: 5 },
  // Push Away (Horizontal)
  { id: "push_hor_away_box", name: "Push-up from Box", categoryId: "push_horizontal_away", order: 1 },
  { id: "push_hor_away_pushup", name: "Push-up", categoryId: "push_horizontal_away", order: 2 },
  { id: "push_hor_away_ring", name: "Ring Push-up", categoryId: "push_horizontal_away", order: 3 },
  // Push Away (Vertical)
  { id: "push_vert_away_parallette", name: "Parallette Dip", categoryId: "push_vertical_away", order: 1 },
  { id: "push_vert_away_box", name: "Box Dip", categoryId: "push_vertical_away", order: 2 },
  { id: "push_vert_away_bar", name: "Bar Dip", categoryId: "push_vertical_away", order: 3 },
  { id: "push_vert_away_ring", name: "Ring Dip", categoryId: "push_vertical_away", order: 4 },
  // Push Object (Horizontal)
  { id: "push_hor_obj_floor", name: "Floor Press", categoryId: "push_horizontal_object", order: 1 },
  { id: "push_hor_obj_bench", name: "Bench Press", categoryId: "push_horizontal_object", order: 2 },
  // Push Object (Vertical)
  { id: "push_vert_obj_press", name: "Press", categoryId: "push_vertical_object", order: 1 },
  { id: "push_vert_obj_push_press", name: "Push Press", categoryId: "push_vertical_object", order: 2 },
  { id: "push_vert_obj_push_jerk", name: "Push Jerk", categoryId: "push_vertical_object", order: 3 },
  { id: "push_vert_obj_split_jerk", name: "Split Jerk", categoryId: "push_vertical_object", order: 4 },
  // Push Inverted (Handstand)
  { id: "push_inv_away_pike", name: "Pike Hold", categoryId: "push_inverted_away", order: 1 },
  { id: "push_inv_away_kick_up", name: "Kick Up to Handstand", categoryId: "push_inverted_away", order: 2 },
  { id: "push_inv_away_wall", name: "Wall-assisted Handstand", categoryId: "push_inverted_away", order: 3 },
  { id: "push_inv_away_wallwalk", name: "Wallwalk", categoryId: "push_inverted_away", order: 4 },
  { id: "push_inv_away_shoulder_taps", name: "Shoulder Taps", categoryId: "push_inverted_away", order: 5 },
  { id: "push_inv_away_handstand", name: "Handstand", categoryId: "push_inverted_away", order: 6 },
  { id: "push_inv_away_handstand_walk", name: "Handstand Walk", categoryId: "push_inverted_away", order: 7 },
  // Push Inverted (HeSPU)
  { id: "push_hespu_down_dog", name: "Down Dog Pike Push-up", categoryId: "push_inverted_object_hespu", order: 1 },
  { id: "push_hespu_pike_box", name: "Pike Push-up from Box", categoryId: "push_inverted_object_hespu", order: 2 },
  { id: "push_hespu_headstand", name: "Headstand Push-up", categoryId: "push_inverted_object_hespu", order: 3 },
  { id: "push_hespu_kipping", name: "Kipping HeSPU", categoryId: "push_inverted_object_hespu", order: 4 },
  { id: "push_hespu_deficit", name: "Deficit HeSPU", categoryId: "push_inverted_object_hespu", order: 5 },
  { id: "push_hespu_freestanding", name: "Freestanding HeSPU", categoryId: "push_inverted_object_hespu", order: 6 },
  // Kettlebells
  { id: "kb_russian_swing", name: "Russian Swing", categoryId: "kettlebells", order: 1 },
  { id: "kb_american_swing", name: "American Swing", categoryId: "kettlebells", order: 2 },
  { id: "kb_one_hand_swing", name: "One-hand Swing", categoryId: "kettlebells", order: 3 },
  { id: "kb_clean", name: "Kettlebell Clean", categoryId: "kettlebells", order: 4 },
  { id: "kb_double_clean", name: "Double Kettlebell Clean", categoryId: "kettlebells", order: 5 },
  // Pull Object (Floor to Hip)
  { id: "pull_hip_rdl", name: "Romanian Deadlift", categoryId: "pull_floor_to_hip", order: 1 },
  { id: "pull_hip_deadlift", name: "Deadlift", categoryId: "pull_floor_to_hip", order: 2 },
  // Pull Object (Floor to Shoulder)
  { id: "pull_shoulder_muscle_clean", name: "Muscle Clean", categoryId: "pull_floor_to_shoulder", order: 1 },
  { id: "pull_shoulder_power_clean", name: "Power Clean", categoryId: "pull_floor_to_shoulder", order: 2 },
  { id: "pull_shoulder_power_clean_squat", name: "Power Clean + Front Squat", categoryId: "pull_floor_to_shoulder", order: 3 },
  { id: "pull_shoulder_clean", name: "Clean", categoryId: "pull_floor_to_shoulder", order: 4 },
  { id: "pull_shoulder_db_muscle_clean", name: "Dumbbell Muscle Clean", categoryId: "pull_floor_to_shoulder", order: 5 },
  { id: "pull_shoulder_db_power_clean", name: "Dumbbell Power Clean", categoryId: "pull_floor_to_shoulder", order: 6 },
  { id: "pull_shoulder_db_power_clean_squat", name: "DB Power Clean + Front Squat", categoryId: "pull_floor_to_shoulder", order: 7 },
  { id: "pull_shoulder_db_clean", name: "Dumbbell Clean", categoryId: "pull_floor_to_shoulder", order: 8 },
  // Pull Object (Floor to Overhead)
  { id: "pull_oh_muscle_snatch", name: "Muscle Snatch", categoryId: "pull_floor_to_overhead", order: 1 },
  { id: "pull_oh_power_snatch", name: "Power Snatch", categoryId: "pull_floor_to_overhead", order: 2 },
  { id: "pull_oh_power_snatch_squat", name: "Power Snatch + Overhead Squat", categoryId: "pull_floor_to_overhead", order: 3 },
  { id: "pull_oh_snatch", name: "Snatch", categoryId: "pull_floor_to_overhead", order: 4 },
  { id: "pull_oh_db_power_snatch", name: "Dumbbell Power Snatch", categoryId: "pull_floor_to_overhead", order: 5 },
  { id: "pull_oh_db_power_snatch_squat", name: "DB Power Snatch + Overhead Squat", categoryId: "pull_floor_to_overhead", order: 6 },
  { id: "pull_oh_db_snatch", name: "Dumbbell Snatch", categoryId: "pull_floor_to_overhead", order: 7 },
  // Pull to Object
  { id: "pull_to_obj_scapular", name: "Scapular Pull-ups", categoryId: "pull_to_object", order: 1 },
  { id: "pull_to_obj_ring_row", name: "Ring Row", categoryId: "pull_to_object", order: 2 },
  { id: "pull_to_obj_piked_ring_row", name: "Piked Ring Row", categoryId: "pull_to_object", order: 3 },
  { id: "pull_to_obj_strict_pullup", name: "Strict Pull-up", categoryId: "pull_to_object", order: 4 },
  { id: "pull_to_obj_weighted_pullup", name: "Weighted Pull-up", categoryId: "pull_to_object", order: 5 },
  { id: "pull_to_obj_l_pullup", name: "L Pull-up", categoryId: "pull_to_object", order: 6 },
  { id: "pull_to_obj_jumping_pullups", name: "Jumping Pull-ups", categoryId: "pull_to_object", order: 7 },
  { id: "pull_to_obj_kip_swing", name: "Kip Swing", categoryId: "pull_to_object", order: 8 },
  { id: "pull_to_obj_kipping_pullup", name: "Kipping Pull-up", categoryId: "pull_to_object", order: 9 },
  { id: "pull_to_obj_ctb", name: "Chest-to-Bar Kipping Pull-up", categoryId: "pull_to_object", order: 10 },
  { id: "pull_to_obj_butterfly", name: "Butterfly Pull-up", categoryId: "pull_to_object", order: 11 },
  { id: "pull_to_obj_false_grip_row", name: "False-grip Ring Row", categoryId: "pull_to_object", order: 12 },
  { id: "pull_to_obj_band_muscleup", name: "Band-assisted Muscle-up", categoryId: "pull_to_object", order: 13 },
  { id: "pull_to_obj_ring_muscleup", name: "Ring Muscle-up", categoryId: "pull_to_object", order: 14 },
  { id: "pull_to_obj_bar_muscleup", name: "Bar Muscle-up", categoryId: "pull_to_object", order: 15 },
  // Rope Climb
  { id: "rope_seated", name: "Rope Climb from Seated", categoryId: "rope_climb", order: 1 },
  { id: "rope_plank", name: "Plank Rope Climb", categoryId: "rope_climb", order: 2 },
  { id: "rope_climb", name: "Rope Climb", categoryId: "rope_climb", order: 3 },
  { id: "rope_legless", name: "Legless Rope Climb", categoryId: "rope_climb", order: 4 },
];

export const SKILL_MOVEMENTS = MOVEMENTS;

export function getMovementsByCategory(categoryId: SkillCategoryId): SkillMovement[] {
  return MOVEMENTS.filter((m) => m.categoryId === categoryId).sort((a, b) => a.order - b.order);
}

export function getCategoryById(id: SkillCategoryId): SkillCategory | undefined {
  return SKILL_CATEGORIES.find((c) => c.id === id);
}

export function getMovementById(id: string): SkillMovement | undefined {
  return MOVEMENTS.find((m) => m.id === id);
}

export function getAllMovementsOrdered(): SkillMovement[] {
  return [...MOVEMENTS].sort((a, b) => {
    const catA = SKILL_CATEGORIES.findIndex((c) => c.id === a.categoryId);
    const catB = SKILL_CATEGORIES.findIndex((c) => c.id === b.categoryId);
    if (catA !== catB) return catA - catB;
    return a.order - b.order;
  });
}
