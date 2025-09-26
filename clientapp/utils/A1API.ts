/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/**
 * 资源类型:
 * - svgIconLight: SVG图标(浅色)
 * - svgIconDark: SVG图标(深色)
 * - trophysGold: 金牌奖杯
 * - trophysSilver: 银牌奖杯
 * - trophysBronze: 铜牌奖杯
 * - schoolLogo: 学校Logo
 * - schoolSmallIcon: 学校小图标
 * - fancyBackGroundIconWhite: 白色背景图标
 * - fancyBackGroundIconBlack: 黑色背景图标
 * - gameIconLight: 比赛图标(浅色)
 * - gameIconDark: 比赛图标(深色)
 */
export enum SystemResourceType {
  SvgIconLight = "svgIconLight",
  SvgIconDark = "svgIconDark",
  TrophysGold = "trophysGold",
  TrophysSilver = "trophysSilver",
  TrophysBronze = "trophysBronze",
  SchoolLogo = "schoolLogo",
  SchoolSmallIcon = "schoolSmallIcon",
  FancyBackGroundIconWhite = "fancyBackGroundIconWhite",
  FancyBackGroundIconBlack = "fancyBackGroundIconBlack",
  GameIconLight = "gameIconLight",
  GameIconDark = "gameIconDark",
}

/**
 * 日志类别:
 * - ADMIN: 管理员操作
 * - USER: 用户操作
 * - SYSTEM: 系统操作
 * - CONTAINER: 容器操作
 * - JUDGE: 判题操作
 * - SECURITY: 安全相关
 */
export enum LogCategory {
  ADMIN = "ADMIN",
  USER = "USER",
  SYSTEM = "SYSTEM",
  CONTAINER = "CONTAINER",
  JUDGE = "JUDGE",
  SECURITY = "SECURITY",
}

/**
 * User role enumeration:
 * - ADMIN - Administrator
 * - USER - Regular user
 * - MONITOR - Monitor
 * @example "USER"
 */
export enum UserRole {
  ADMIN = "ADMIN",
  USER = "USER",
  MONITOR = "MONITOR",
}

/**
 * Possible statuses of a container:
 * - `ContainerStopped`: The container is stopped.
 * - `ContainerRunning`: The container is running.
 * - `ContainerStarting`: The container is starting.
 * - `ContainerError`: The container encountered an error.
 * - `ContainerStopping`: The container is stopping.
 * - `ContainerQueueing`: The container is in a queue.
 * - `NoContainer`: No container exists.
 */
export enum ContainerStatus {
  ContainerStopped = "ContainerStopped",
  ContainerRunning = "ContainerRunning",
  ContainerStarting = "ContainerStarting",
  ContainerError = "ContainerError",
  ContainerStopping = "ContainerStopping",
  ContainerQueueing = "ContainerQueueing",
  NoContainer = "NoContainer",
}

export enum NoticeCategory {
  FirstBlood = "FirstBlood",
  SecondBlood = "SecondBlood",
  ThirdBlood = "ThirdBlood",
  NewChallenge = "NewChallenge",
  NewHint = "NewHint",
  NewAnnouncement = "NewAnnouncement",
}

/**
 * Team participation status:
 * - UnRegistered: 未报名
 * - Pending: 已报名，等待审核
 * - Approved: 已报名，审核通过
 * - Rejected: 已报名，审核不通过
 * - Participated: 已报名，已参加
 * - Banned: 已被禁赛
 */
export enum ParticipationStatus {
  UnRegistered = "UnRegistered",
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  Participated = "Participated",
  Banned = "Banned",
  UnLogin = "UnLogin",
}

export enum ChallengeContainerType {
  DYNAMIC_CONTAINER = "DYNAMIC_CONTAINER",
  STATIC_CONTAINER = "STATIC_CONTAINER",
  NO_CONTAINER = "NO_CONTAINER",
}

export enum FlagType {
  FlagTypeDynamic = "FlagTypeDynamic",
  FlagTypeStatic = "FlagTypeStatic",
}

export enum ChallengeCategory {
  MISC = "MISC",
  CRYPTO = "CRYPTO",
  PWN = "PWN",
  WEB = "WEB",
  REVERSE = "REVERSE",
  FORENSICS = "FORENSICS",
  BLOCKCHAIN = "BLOCKCHAIN",
  HARDWARE = "HARDWARE",
  MOBILE = "MOBILE",
  PPC = "PPC",
  AI = "AI",
  PENTEST = "PENTEST",
  OSINT = "OSINT",
}

export enum JudgeType {
  DYNAMIC = "DYNAMIC",
  SCRIPT = "SCRIPT",
}

/**
 * Type of the attachment:
 * - STATICFILE: Static file stored on server
 * - DYNAMICFILE: Dynamically generated file
 * - REMOTEFILE: File hosted on external server
 * @example "STATICFILE"
 */
export enum AttachmentType {
  STATICFILE = "STATICFILE",
  DYNAMICFILE = "DYNAMICFILE",
  REMOTEFILE = "REMOTEFILE",
}

/** User login form */
export interface UserLogin {
  username: string;
  password: string;
  captcha?: string;
}

/** User register form */
export interface UserRegister {
  username: string;
  password: string;
  captcha?: string;
  email: string;
}

export interface Attachment {
  attach_hash?: string | null;
  attach_name: string;
  /**
   * Type of the attachment:
   * - STATICFILE: Static file stored on server
   * - DYNAMICFILE: Dynamically generated file
   * - REMOTEFILE: File hosted on external server
   */
  attach_type: AttachmentType;
  attach_url: string;
  generate_script?: string | null;
}

export interface ExposePort {
  name: string;
  port: number;
}

export interface Container {
  command?: string[] | null;
  env?: EnvironmentItem[];
  expose_ports: ExposePort[];
  image: string;
  name: string;
  cpu_limit?: number;
  memory_limit?: number;
  storage_limit?: number;
}

export interface JudgeConfig {
  flag_template: string;
  judge_script?: string | null;
  judge_type: JudgeType;
}

export interface EnvironmentItem {
  name: string;
  value: string;
}

export interface AdminChallengeSimpleInfo {
  challenge_id: number;
  name: string;
  description: string;
  category: ChallengeCategory;
  /** @format date-time */
  create_time: string;
}

export interface AdminChallengeConfig {
  attachments?: Attachment[];
  category: ChallengeCategory;
  challenge_id?: number;
  allow_wan?: boolean;
  allow_dns?: boolean;
  container_config: Container[];
  /** @format date-time */
  create_time?: string;
  description: string;
  judge_config: JudgeConfig;
  name: string;
  flag_type?: FlagType;
}

export interface ErrorMessage {
  code: number;
  message: string;
}

export interface GameStage {
  stage_name: string;
  /** @format date-time */
  start_time: string;
  /** @format date-time */
  end_time: string;
}

export interface AdminDetailGameChallenge {
  challenge_id?: number;
  challenge_name?: string;
  /** @format double */
  total_score?: number;
  /** @format double */
  cur_score?: number;
  hints?: {
    content: string;
    /** @format date-time */
    create_time: string;
    visible: boolean;
  }[];
  belong_stage?: string;
  solve_count?: number;
  visible?: boolean;
  category?: ChallengeCategory;
  judge_config?: JudgeConfig;
  minimal_score?: number;
  /** @format double */
  difficulty?: number;
  enable_blood_reward?: boolean;
}

export interface AddGameChallengePayload {
  challenge_id: number;
  game_id: number;
}

export interface AdminFullGameInfo {
  /** @format int64 */
  game_id: number;
  name: string;
  summary?: string | null;
  description?: string | null;
  poster?: string | null;
  invite_code?: string | null;
  game_icon_light?: string | null;
  game_icon_dark?: string | null;
  /** @format date-time */
  start_time: string;
  /** @format date-time */
  end_time: string;
  practice_mode: boolean;
  team_number_limit: number;
  team_policy: "Manual" | "Auto";
  container_number_limit: number;
  require_wp: boolean;
  /** @format date-time */
  wp_expire_time: string;
  visible: boolean;
  stages: GameStage[];
  first_blood_reward?: number;
  second_blood_reward?: number;
  third_blood_reward?: number;
  group_invite_code_enable?: boolean;
  challenges?: AdminDetailGameChallenge[];
}

export interface UserGameSimpleInfo {
  /** @format int64 */
  game_id: number;
  name: string;
  summary: string | null;
  poster?: string | null;
  group_invite_code_enabled?: boolean;
  /** @format date-time */
  start_time: string;
  /** @format date-time */
  end_time: string;
  dark_icon?: string;
  light_icon?: string;
  visible: boolean;
}

export interface SolveRecord {
  user_id: string;
  game_id: number;
  /** @format date-time */
  solve_time: string;
  challenge_id: number;
  /** @format float */
  score: number;
  solve_rank: number;
}

export interface UserSimpleGameChallenge {
  challenge_id: number;
  challenge_name: string;
  /** @format double */
  total_score: number;
  /** @format double */
  cur_score: number;
  solve_count?: number;
  visible?: boolean;
  category?: ChallengeCategory;
  belong_stage?: string;
}

export interface UserSimpleGameSolvedChallenge {
  challenge_id: number;
  challenge_name: string;
  /** @format date-time */
  solve_time: string;
  rank: number;
}

export interface UserAttachmentConfig {
  /**
   * The name of the attachment
   * @example "example.pdf"
   */
  attach_name: string;
  /**
   * Type of the attachment:
   * - STATICFILE: Static file stored on server
   * - DYNAMICFILE: Dynamically generated file
   * - REMOTEFILE: File hosted on external server
   */
  attach_type: AttachmentType;
  /**
   * URL of the attachment (if applicable)
   * @example "https://example.com/files/example.pdf"
   */
  attach_url?: string | null;
  /**
   * Hash of the attachment content
   * @example "a1b2c3d4e5f6"
   */
  attach_hash?: string | null;
  /**
   * Unique hash for download authorization
   * @example "d4e5f6a1b2c3"
   */
  download_hash?: string | null;
}

export interface UserDetailGameChallenge {
  challenge_id: number;
  challenge_name: string;
  description?: string;
  /** @format double */
  total_score: number;
  /** @format double */
  cur_score: number;
  hints?: {
    content: string;
    /** @format date-time */
    create_time: string;
    visible: boolean;
  }[];
  belong_stage?: string;
  solve_count?: number;
  category?: ChallengeCategory;
  container_type?: ChallengeContainerType;
  visible?: boolean;
  /**
   * Possible statuses of a container:
   * - `ContainerStopped`: The container is stopped.
   * - `ContainerRunning`: The container is running.
   * - `ContainerStarting`: The container is starting.
   * - `ContainerError`: The container encountered an error.
   * - `ContainerStopping`: The container is stopping.
   * - `ContainerQueueing`: The container is in a queue.
   * - `NoContainer`: No container exists.
   */
  container_status?: ContainerStatus;
  /** @format date-time */
  container_expiretime?: string;
  containers?: ExposePortInfo[];
  attachments?: UserAttachmentConfig[];
}

export interface UserTeamInfo {
  /** @format int64 */
  team_id: number;
  /** @format int64 */
  game_id: number;
  team_name: string;
  team_avatar?: string | null;
  team_slogan?: string | null;
  team_description?: string | null;
  rank?: number | null;
  penalty?: number | null;
  group_name?: string | null;
  team_members?: {
    captain?: boolean;
    /** 用户头像URL */
    avatar?: string | null;
    /** 用户名 */
    user_name: string;
    /** 用户ID */
    user_id: string;
  }[];
  /** @format double */
  team_score: number;
  team_hash: string;
  invite_code?: string | null;
  /**
   * Team participation status:
   * - UnRegistered: 未报名
   * - Pending: 已报名，等待审核
   * - Approved: 已报名，审核通过
   * - Rejected: 已报名，审核不通过
   * - Participated: 已报名，已参加
   * - Banned: 已被禁赛
   */
  team_status: ParticipationStatus;
}

export interface UserFullGameInfo {
  /** @format int64 */
  game_id: number;
  name: string;
  summary?: string | null;
  description?: string | null;
  poster?: string | null;
  /** @format date-time */
  start_time: string;
  /** @format date-time */
  end_time: string;
  practice_mode: boolean;
  team_number_limit: number;
  container_number_limit: number;
  group_invite_code_enabled?: boolean;
  require_wp: boolean;
  /** @format date-time */
  wp_expire_time: string;
  visible: boolean;
  game_icon_light?: string | null;
  game_icon_dark?: string | null;
  stages: GameStage[];
  /**
   * Team participation status:
   * - UnRegistered: 未报名
   * - Pending: 已报名，等待审核
   * - Approved: 已报名，审核通过
   * - Rejected: 已报名，审核不通过
   * - Participated: 已报名，已参加
   * - Banned: 已被禁赛
   */
  team_status: ParticipationStatus;
  team_info?: UserTeamInfo;
}

export interface GameNotice {
  /** @format int64 */
  notice_id: number;
  notice_category: NoticeCategory;
  data: string[];
  /** @format date-time */
  create_time: string;
}

export interface CreateGameTeamPayload {
  name: string;
  description: string;
  slogan: string;
  /** 选择的分组ID，如果不传则不指定分组 */
  group_id?: number | null;
}

export interface ExposePortInfo {
  container_name: string;
  container_ports: {
    port_name: string;
    port: number;
    ip: string;
  }[];
}

export interface GameScoreboardResponse {
  /** @example 200 */
  code?: number;
  data?: GameScoreboardData;
}

export interface GameScoreboardData {
  /** @example 1 */
  game_id?: number;
  /** @example "测试比赛1" */
  name?: string;
  teams?: TeamScore[];
  your_team?: TeamScore;
  top10_timelines?: TeamTimeline[];
  team_timelines?: TeamTimeline[];
  challenges?: UserSimpleGameChallenge[];
  groups?: GameGroupSimple[];
  current_group?: GameGroupSimple;
  pagination?: PaginationInfo;
}

export interface TeamScore {
  /** @example 1 */
  team_id?: number;
  /** @example "test114514" */
  team_name?: string;
  /** @example null */
  team_avatar?: string | null;
  /** @example "" */
  team_slogan?: string;
  team_members?: AdminSimpleTeamMemberInfo[];
  /** @example "" */
  team_description?: string;
  /** @example 1 */
  rank?: number;
  /** @example 100 */
  penalty?: number;
  /**
   * @format float
   * @example 500
   */
  score?: number;
  /** 所属分组ID */
  group_id?: number | null;
  /** 所属分组名称 */
  group_name?: string | null;
  solved_challenges?: SolvedChallenge[];
  score_adjustments?: TeamScoreAdjustment[];
}

export interface SolvedChallenge {
  /** @example 1 */
  challenge_id?: number;
  /**
   * @format float
   * @example 500
   */
  score?: number;
  /** @example "root" */
  solver?: string;
  /** @example 1 */
  rank?: number;
  /**
   * @format date-time
   * @example "2025-05-03T07:07:34.650351Z"
   */
  solve_time?: string;
  /**
   * @format float
   * @example 0
   */
  blood_reward?: number;
  challenge_name?: string;
}

export interface TeamScoreAdjustment {
  /** 分数修正ID */
  adjustment_id: number;
  /** 修正类型 */
  adjustment_type: "cheat" | "reward" | "other";
  /** 分数变化量 */
  score_change: number;
  /** 修正原因 */
  reason: string;
  /**
   * 创建时间
   * @format date-time
   */
  created_at: string;
}

export interface TeamTimeline {
  /** @example 1 */
  team_id?: number;
  /** @example "test114514" */
  team_name?: string;
  scores?: ScoreRecord[];
}

export interface ScoreRecord {
  record_time?: number;
  /**
   * @format float
   * @example 500
   */
  score?: number;
}

export interface AdminListUserItem {
  /** The unique identifier of the user */
  user_id: string;
  /** The username of the user */
  user_name: string;
  /** The real name of the user */
  real_name?: string | null;
  /** The student ID of the user */
  student_id?: string | null;
  /** The phone number of the user */
  phone?: string | null;
  /** The user's slogan or motto */
  slogan?: string | null;
  /**
   * The timestamp when the user registered
   * @format date-time
   */
  register_time: string;
  /** The IP address of the user's registration */
  register_ip?: string;
  /**
   * The timestamp of the user's last login
   * @format date-time
   */
  last_login_time: string;
  /** The IP address of the user's last login */
  last_login_ip?: string | null;
  /** The email address of the user */
  email?: string | null;
  /** URL to the user's avatar image */
  avatar?: string | null;
  /** The role of the user */
  role: UserRole;
  /** Whether the user's email has been verified */
  email_verified: boolean;
}

export interface AdminSimpleTeamMemberInfo {
  avatar?: string | null;
  user_name: string;
  user_id: string;
}

export interface AdminListTeamItem {
  /** @format int64 */
  team_id: number;
  team_name: string;
  team_avatar?: string | null;
  team_slogan?: string | null;
  group_name?: string | null;
  group_id?: number | null;
  members: AdminSimpleTeamMemberInfo[];
  /**
   * Team participation status:
   * - UnRegistered: 未报名
   * - Pending: 已报名，等待审核
   * - Approved: 已报名，审核通过
   * - Rejected: 已报名，审核不通过
   * - Participated: 已报名，已参加
   * - Banned: 已被禁赛
   */
  status: ParticipationStatus;
  /** @format double */
  score: number;
}

export interface AdminListTeamsPayload {
  game_id: number;
  /** @min 0 */
  size: number;
  offset?: number;
  /** 搜索关键词，用于过滤队伍名称或队伍口号 */
  search?: string;
}

export interface AdminTeamOperationPayload {
  /**
   * 要操作的队伍ID
   * @format int64
   */
  team_id: number;
  /** 游戏ID（可选） */
  game_id?: number;
}

export interface AdminUpdateUserPayload {
  /** The unique identifier of the user */
  user_id: string;
  /** The username of the user */
  user_name: string;
  /** The real name of the user */
  real_name?: string | null;
  /** The student ID of the user */
  student_id?: string | null;
  /** The phone number of the user */
  phone?: string | null;
  /** The user's slogan or motto */
  slogan?: string | null;
  /** The email address of the user */
  email?: string | null;
  /** URL to the user's avatar image */
  avatar?: string | null;
  /** The role of the user */
  role: UserRole;
}

export interface AdminUserOperationPayload {
  /** The unique identifier of the user */
  user_id: string;
}

export interface AdminContainerItem {
  container_id: string;
  container_name: string;
  /** @format int64 */
  team_id?: number;
  /** @format int64 */
  challenge_id?: number;
  container_status: string;
  /** @format date-time */
  container_expiretime: string;
  container_type: string;
  container_name_list?: string[];
  pod_id?: string;
  container_ports: {
    port_name: string;
    port: number;
    ip: string;
  }[];
  team_name: string;
  game_name: string;
  challenge_name: string;
}

export interface AdminListContainersPayload {
  game_id: number;
  challenge_id?: number;
  /** @min 0 */
  size: number;
  offset?: number;
  /** 搜索关键词，用于过滤容器名称、队伍名称或游戏名称 */
  search?: string;
  /** 是否显示失败的容器 */
  show_failed?: boolean;
}

export interface AdminContainerOperationPayload {
  container_id: string;
}

export interface AdminExtendContainerPayload {
  container_id: string;
}

export interface UserProfile {
  user_id: string;
  username: string;
  /**
   * User role enumeration:
   * - ADMIN - Administrator
   * - USER - Regular user
   * - MONITOR - Monitor
   */
  role: UserRole;
  phone?: string | null;
  student_number?: string | null;
  realname?: string | null;
  slogan?: string | null;
  avatar?: string | null;
  email?: string | null;
  email_verified: boolean;
  /** @format date-time */
  register_time: string;
  /** @format date-time */
  last_login_time: string;
  last_login_ip: string | null;
  /** @format date-time */
  client_config_version?: string;
}

export interface UserProfileUpdatePayload {
  phone?: string | null;
  student_number?: string | null;
  realname?: string | null;
  slogan?: string | null;
  username: string;
}

export interface TeamJoinPayload {
  /** 战队邀请码 */
  invite_code: string;
}

export interface TransferCaptainPayload {
  /** 新队长的用户ID */
  new_captain_id: string;
}

export interface UpdateTeamInfoPayload {
  /** 战队口号 */
  team_slogan: string | null;
}

export interface GameGroup {
  /** 分组ID */
  group_id: number;
  /** 分组名称 */
  group_name: string;
  /** 分组描述 */
  group_description?: string | null;
  /** 显示顺序 */
  display_order: number;
  /**
   * 创建时间
   * @format date-time
   */
  created_at: string;
  /** 邀请码 */
  invite_code?: string;
  /**
   * 更新时间
   * @format date-time
   */
  updated_at: string;
  teams: AdminListTeamItem[];
}

export interface AdminGameGroupItem {
  /** 分组ID */
  group_id: number;
  /** 分组名称 */
  group_name: string;
  /** 分组描述 */
  group_description?: string | null;
  /** 显示顺序 */
  display_order: number;
  /**
   * 创建时间
   * @format date-time
   */
  created_at?: string;
  /** 邀请码 */
  invite_code?: string;
  /**
   * 更新时间
   * @format date-time
   */
  updated_at?: string;
  people_count: number;
}

export interface CreateGameGroupPayload {
  /** 分组名称 */
  group_name: string;
  /** 分组描述 */
  description: string;
}

export interface UpdateGameGroupPayload {
  /** 分组名称 */
  group_name: string;
  /** 分组描述 */
  description: string;
}

export interface GameGroupSimple {
  /** 分组ID */
  group_id: number;
  /** 分组名称 */
  group_name: string;
  /** 分组内队伍数量 */
  team_count: number;
}

export interface PaginationInfo {
  /** 当前页码 */
  current_page: number;
  /** 每页大小 */
  page_size: number;
  /** 总记录数 */
  total_count: number;
  /** 总页数 */
  total_pages: number;
}

export interface AdminCreateNoticePayload {
  /** 公告标题 */
  title: string;
  /** 公告内容 */
  content: string;
}

export interface AdminListNoticesPayload {
  /** 游戏ID */
  game_id: number;
  /** 每页大小 */
  size: number;
  /** 偏移量 */
  offset: number;
}

export interface AdminNoticeItem {
  /** 公告ID */
  notice_id: number;
  /** 公告标题 */
  title: string;
  /** 公告内容 */
  content: string;
  /**
   * 创建时间
   * @format date-time
   */
  create_time: string;
}

export interface AdminDeleteNoticePayload {
  /** 公告ID */
  notice_id: number;
}

export interface ScoreAdjustmentInfo {
  /** 分数修正ID */
  adjustment_id: number;
  /** 队伍ID */
  team_id: number;
  /** 队伍名称 */
  team_name: string;
  /** 修正类型 */
  adjustment_type: "cheat" | "reward" | "other";
  /** 分数变化量 */
  score_change: number;
  /** 修正原因 */
  reason: string;
  /** 创建者用户ID */
  created_by: number;
  /** 创建者用户名 */
  created_by_username: string;
  /**
   * 创建时间
   * @format date-time
   */
  created_at: string;
  /**
   * 更新时间
   * @format date-time
   */
  updated_at: string;
}

export interface CreateScoreAdjustmentPayload {
  /** 队伍ID */
  team_id: number;
  /** 修正类型 */
  adjustment_type: "cheat" | "reward" | "other";
  /** 分数变化量 */
  score_change: number;
  /** 修正原因 */
  reason: string;
}

export interface UpdateScoreAdjustmentPayload {
  /** 修正类型 */
  adjustment_type: "cheat" | "reward" | "other";
  /** 分数变化量 */
  score_change: number;
  /** 修正原因 */
  reason: string;
}

export interface DeleteChallengeSolvesPayload {
  /** 队伍ID（可选，不提供则删除所有解题记录） */
  team_id?: number;
}

export interface SystemLogItem {
  /**
   * 日志ID
   * @format int64
   */
  log_id: number;
  /**
   * 日志类别:
   * - ADMIN: 管理员操作
   * - USER: 用户操作
   * - SYSTEM: 系统操作
   * - CONTAINER: 容器操作
   * - JUDGE: 判题操作
   * - SECURITY: 安全相关
   */
  log_category: LogCategory;
  /** 用户ID */
  user_id?: string | null;
  /** 用户名 */
  username?: string | null;
  /** 操作类型 */
  action: string;
  /** 资源类型 */
  resource_type: string;
  /** 资源ID */
  resource_id?: string | null;
  /** 详细信息 */
  details?: object | null;
  /** IP地址 */
  ip_address?: string | null;
  /** 用户代理 */
  user_agent?: string | null;
  /** 状态 */
  status: "SUCCESS" | "FAILED" | "WARNING";
  /** 错误信息 */
  error_message?: string | null;
  /**
   * 创建时间
   * @format date-time
   */
  create_time: string;
  /**
   * 游戏ID
   * @format int64
   */
  game_id?: number | null;
  /**
   * 挑战ID
   * @format int64
   */
  challenge_id?: number | null;
  /**
   * 队伍ID
   * @format int64
   */
  team_id?: number | null;
}

export interface SystemLogStats {
  /**
   * 总日志数（最近24小时）
   * @format int64
   */
  total_logs: number;
  /**
   * 成功日志数
   * @format int64
   */
  success_logs: number;
  /**
   * 失败日志数
   * @format int64
   */
  failed_logs: number;
  /**
   * 管理员操作日志数
   * @format int64
   */
  admin_logs: number;
  /**
   * 用户操作日志数
   * @format int64
   */
  user_logs: number;
  /**
   * 安全相关日志数
   * @format int64
   */
  security_logs: number;
}

export interface AdminListSubmitsPayload {
  /** 游戏ID */
  game_id: number;
  /** 每页大小 */
  size: number;
  /** 偏移量 */
  offset: number;
  /** 题目ID 列表（可选，OR 关系） */
  challenge_ids?: number[];
  /** 题目名称关键词列表（模糊匹配，可选，OR 关系） */
  challenge_names?: string[];
  /** 队伍ID 列表（可选） */
  team_ids?: number[];
  /** 队伍名称关键词列表（模糊匹配，可选） */
  team_names?: string[];
  /** 评测结果列表（可选，OR 关系） */
  judge_statuses?: (
    | "JudgeAC"
    | "JudgeWA"
    | "JudgeError"
    | "JudgeTimeout"
    | "JudgeQueueing"
    | "JudgeRunning"
  )[];
  /**
   * 开始时间（可选）
   * @format date-time
   */
  start_time?: string;
  /**
   * 结束时间（可选）
   * @format date-time
   */
  end_time?: string;
}

export interface AdminSubmitItem {
  /** 判题ID */
  judge_id: string;
  /** 提交者用户名 */
  username: string;
  /** 提交者队伍名 */
  team_name: string;
  team_id: number;
  challenge_id: number;
  /** 提交的FLAG内容 */
  flag_content: string;
  /** 题目名称 */
  challenge_name: string;
  /** 判题状态 */
  judge_status:
    | "JudgeAC"
    | "JudgeWA"
    | "JudgeError"
    | "JudgeTimeout"
    | "JudgeQueueing"
    | "JudgeRunning";
  /**
   * 判题时间
   * @format date-time
   */
  judge_time: string;
}

export interface AdminListCheatsPayload {
  /** 游戏ID */
  game_id: number;
  /** 每页大小 */
  size: number;
  /** 偏移量 */
  offset: number;
  /** 题目ID 列表（可选，OR 关系） */
  challenge_ids?: number[];
  /** 题目名称关键词列表（模糊匹配，可选，OR 关系） */
  challenge_names?: string[];
  /** 队伍ID 列表（可选） */
  team_ids?: number[];
  /** 队伍名称关键词列表（模糊匹配，可选） */
  team_names?: string[];
  /** 作弊类型列表（可选，OR 关系） */
  cheat_types?: (
    | "SubmitSomeonesFlag"
    | "SubmitWithoutDownloadAttachments"
    | "SubmitWithoutStartContainer"
  )[];
  /**
   * 开始时间（可选）
   * @format date-time
   */
  start_time?: string;
  /**
   * 结束时间（可选）
   * @format date-time
   */
  end_time?: string;
}

export interface AdminCheatItem {
  /** 作弊记录ID */
  cheat_id: string;
  /** 作弊类型 */
  cheat_type:
    | "SubmitSomeonesFlag"
    | "SubmitWithoutDownloadAttachments"
    | "SubmitWithoutStartContainer";
  /** 作弊者用户名 */
  username: string;
  /** 作弊者队伍名 */
  team_name: string;
  /** 队伍ID */
  team_id: number;
  /** 题目ID */
  challenge_id: number;
  /** 题目名称 */
  challenge_name: string;
  /** 相关判题ID */
  judge_id: string;
  /** 相关FLAG ID */
  flag_id?: number | null;
  /** 额外数据 */
  extra_data: object;
  /**
   * 作弊时间
   * @format date-time
   */
  cheat_time: string;
  /** 提交者IP地址 */
  submiter_ip?: string | null;
}

/** 系统设置完整结构体 */
export interface SystemSettings {
  /**
   * 系统名称
   * @maxLength 100
   * @example "A1CTF"
   */
  systemName: string;
  /**
   * 系统logo URL
   * @example "/images/logo.png"
   */
  systemLogo?: string;
  /**
   * 系统标语
   * @maxLength 200
   * @example "A Modern CTF Platform"
   */
  systemSlogan?: string;
  /**
   * 系统简介
   * @example "A comprehensive CTF platform for cybersecurity education"
   */
  systemSummary?: string;
  /**
   * 页面底部信息
   * @maxLength 500
   * @example "© 2025 A1CTF Team"
   */
  systemFooter?: string;
  /**
   * 网站图标 URL
   * @example "/images/favicon.ico"
   */
  systemFavicon?: string;
  /** ICP备案号 */
  systemICP?: string;
  /** 组织名称 */
  systemOrganization?: string;
  /**
   * 组织官网链接
   * @format uri
   */
  systemOrganizationURL?: string;
  /**
   * 主题颜色
   * @example "blue"
   */
  themeColor: "blue" | "red" | "green" | "purple" | "orange" | "gray";
  /**
   * 默认是否为暗色模式
   * @example true
   */
  darkModeDefault: boolean;
  /**
   * 是否允许用户自定义主题
   * @example true
   */
  allowUserTheme: boolean;
  /**
   * 白色背景图标 URL
   * @example "/images/ctf_white.png"
   */
  fancyBackGroundIconWhite?: string;
  /**
   * 黑色背景图标 URL
   * @example "/images/ctf_black.png"
   */
  fancyBackGroundIconBlack?: string;
  /**
   * 默认背景图片 URL
   * @example "/images/defaultbg.jpg"
   */
  defaultBGImage?: string;
  /**
   * SVG图标 URL
   * @example "/images/A1natas.svg"
   */
  svgIcon?: string;
  /**
   * SVG图标替代文本
   * @example "A1natas"
   */
  svgAltData?: string;
  /**
   * 金奖杯图标 URL
   * @example "/images/trophys/gold_trophy.png"
   */
  trophysGold?: string;
  /**
   * 银奖杯图标 URL
   * @example "/images/trophys/silver_trophy.png"
   */
  trophysSilver?: string;
  /**
   * 铜奖杯图标 URL
   * @example "/images/trophys/copper_trophy.png"
   */
  trophysBronze?: string;
  /** 学校logo URL */
  schoolLogo?: string;
  /** 学校小图标 URL */
  schoolSmallIcon?: string;
  /** 学校联合认证文本 */
  schoolUnionAuthText?: string;
  /**
   * 是否启用背景动画
   * @example false
   */
  bgAnimation: boolean;
  /**
   * SMTP服务器地址
   * @example "smtp.example.com"
   */
  smtpHost?: string;
  /**
   * SMTP服务器端口
   * @min 1
   * @max 65535
   * @example 587
   */
  smtpPort: number;
  smtpName?: string;
  smtpPortType?: "none" | "tls" | "starttls";
  /**
   * SMTP用户名
   * @example "noreply@example.com"
   */
  smtpUsername?: string;
  /**
   * SMTP密码
   * @format password
   * @example "password123"
   */
  smtpPassword?: string;
  /**
   * 发件人邮箱
   * @format email
   * @example "noreply@example.com"
   */
  smtpFrom?: string;
  /**
   * 是否启用SMTP
   * @example false
   */
  smtpEnabled: boolean;
  /** 邮箱验证邮件模板 */
  verifyEmailTemplate?: string;
  /** 邮箱验证邮件标题 */
  verEmailHeader?: string;
  /** 忘记密码邮件模板 */
  forgetPasswordTemplate?: string;
  /** 忘记密码邮件标题 */
  forgetPasswordHeader?: string;
  /**
   * 是否启用验证码
   * @example true
   */
  captchaEnabled: boolean;
  /** 比赛模式对应的比赛ID */
  gameActivityMode?: string;
  /**
   * 关于我们内容
   * @example "A1CTF Platform"
   */
  aboutus?: string;
  /**
   * 账户激活方式
   * @example "email"
   */
  accountActivationMethod: "auto" | "email" | "admin";
  /**
   * 是否启用用户注册
   * @example true
   */
  registrationEnabled: boolean;
  /**
   * 默认语言
   * @example "zh-CN"
   */
  defaultLanguage: string;
  /**
   * 时区设置
   * @example "Asia/Shanghai"
   */
  timeZone: string;
  /**
   * 最大上传文件大小(MB)
   * @min 1
   * @max 1024
   * @example 10
   */
  maxUploadSize: number;
  /**
   * 最后更新时间
   * @format date-time
   * @example "2024-01-01T12:00:00Z"
   */
  updatedTime?: string;
}

/**
 * 系统设置部分更新对象。所有字段都是可选的，只需要提供需要更新的字段。
 * 字段定义与 SystemSettings 相同，但都为可选字段。
 */
export interface SystemSettingsPartialUpdate {
  /**
   * 系统名称
   * @maxLength 100
   */
  systemName?: string;
  /** 系统logo URL */
  systemLogo?: string;
  /**
   * 系统标语
   * @maxLength 200
   */
  systemSlogan?: string;
  /** 系统简介 */
  systemSummary?: string;
  /**
   * 页面底部信息
   * @maxLength 500
   */
  systemFooter?: string;
  /** 网站图标 URL */
  systemFavicon?: string;
  /** ICP备案号 */
  systemICP?: string;
  /** 组织名称 */
  systemOrganization?: string;
  /**
   * 组织官网链接
   * @format uri
   */
  systemOrganizationURL?: string;
  /** 主题颜色 */
  themeColor?: string;
  /** 默认是否为暗色模式 */
  darkModeDefault?: boolean;
  /** 是否允许用户自定义主题 */
  allowUserTheme?: boolean;
  /** 白色背景图标 URL */
  fancyBackGroundIconWhite?: string;
  /** 黑色背景图标 URL */
  fancyBackGroundIconBlack?: string;
  /** 默认背景图片 URL */
  defaultBGImage?: string;
  /** SVG图标 URL */
  svgIcon?: string;
  /** SVG图标替代文本 */
  svgAltData?: string;
  /** 金奖杯图标 URL */
  trophysGold?: string;
  /** 银奖杯图标 URL */
  trophysSilver?: string;
  /** 铜奖杯图标 URL */
  trophysBronze?: string;
  /** 学校logo URL */
  schoolLogo?: string;
  /** 学校小图标 URL */
  schoolSmallIcon?: string;
  /** 学校联合认证文本 */
  schoolUnionAuthText?: string;
  /** 是否启用背景动画 */
  bgAnimation?: boolean;
  /** SMTP服务器地址 */
  smtpHost?: string;
  /**
   * SMTP服务器端口
   * @min 1
   * @max 65535
   */
  smtpPort?: number;
  smtpName?: string;
  smtpPortType?: "none" | "tls" | "starttls";
  /** SMTP用户名 */
  smtpUsername?: string;
  /**
   * SMTP密码
   * @format password
   */
  smtpPassword?: string;
  /**
   * 发件人邮箱
   * @format email
   */
  smtpFrom?: string;
  /** 是否启用SMTP */
  smtpEnabled?: boolean;
  /** 邮箱验证邮件模板 */
  verifyEmailTemplate?: string;
  /** 邮箱验证邮件标题 */
  verEmailHeader?: string;
  /** 忘记密码邮件模板 */
  forgetPasswordTemplate?: string;
  /** 忘记密码邮件标题 */
  forgetPasswordHeader?: string;
  /** 是否启用验证码 */
  captchaEnabled?: boolean;
  /** 比赛模式对应的比赛ID */
  gameActivityMode?: string;
  /** 关于我们内容 */
  aboutus?: string;
  /** 账户激活方式 */
  accountActivationMethod?: "auto" | "email" | "admin";
  /** 是否启用用户注册 */
  registrationEnabled?: boolean;
  /** 默认语言 */
  defaultLanguage?: string;
  /** 时区设置 */
  timeZone?: string;
  /**
   * 最大上传文件大小(MB)
   * @min 1
   * @max 1024
   */
  maxUploadSize?: number;
}

/** 错误响应格式 */
export interface Error {
  /** 错误代码 */
  code: number;
  /** 错误信息 */
  message: string;
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "http://localhost:7777/",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title A1CTF API
 * @version 1.0
 * @baseUrl http://localhost:7777/
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  auth = {
    /**
     * No description
     *
     * @tags auth
     * @name UserLogin
     * @summary Login
     * @request POST:/api/auth/login
     */
    userLogin: (data: UserLogin, params: RequestParams = {}) =>
      this.request<void, void>({
        path: `/api/auth/login`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags auth
     * @name UserRegister
     * @summary Register
     * @request POST:/api/auth/register
     */
    userRegister: (data: UserRegister, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/auth/register`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  user = {
    /**
     * @description Get current user profile information
     *
     * @tags user
     * @name GetUserProfile
     * @summary Get current user profile
     * @request GET:/api/account/profile
     */
    getUserProfile: (params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: UserProfile;
        },
        void
      >({
        path: `/api/account/profile`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Update current user's profile
     *
     * @tags user
     * @name UpdateUserProfile
     * @summary Update current user's profile
     * @request PUT:/api/account/profile
     */
    updateUserProfile: (
      data: UserProfileUpdatePayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
        },
        void
      >({
        path: `/api/account/profile`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Update user's email address
     *
     * @tags user
     * @name UpdateEmailAddress
     * @summary Update user's email address
     * @request POST:/api/account/updateEmail
     */
    updateEmailAddress: (
      data: {
        /** @format email */
        email: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
        },
        void
      >({
        path: `/api/account/updateEmail`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Send verify email to user's email address
     *
     * @tags user
     * @name SendVerifyEmail
     * @summary Send verify email
     * @request POST:/api/account/sendVerifyEmail
     */
    sendVerifyEmail: (params: RequestParams = {}) =>
      this.request<
        {
          code: number;
        },
        void
      >({
        path: `/api/account/sendVerifyEmail`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Verify email code
     *
     * @tags user
     * @name VerifyEmailCode
     * @summary Verify email code
     * @request POST:/api/account/verifyEmailCode
     */
    verifyEmailCode: (
      data: {
        code: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
        },
        void
      >({
        path: `/api/account/verifyEmailCode`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Update user's password
     *
     * @tags user
     * @name ChangePassword
     * @summary Update user's password
     * @request POST:/api/account/changePassword
     */
    changePassword: (
      data: {
        old_password: string;
        new_password: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
        },
        void
      >({
        path: `/api/account/changePassword`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description send forget password email
     *
     * @tags user
     * @name SendForgetPasswordEmail
     * @summary send forget password email
     * @request POST:/api/account/sendForgetPasswordEmail
     */
    sendForgetPasswordEmail: (
      data: {
        email: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
        },
        void
      >({
        path: `/api/account/sendForgetPasswordEmail`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Reset user's password
     *
     * @tags user
     * @name ResetPassword
     * @summary Reset user's password
     * @request POST:/api/account/resetPassword
     */
    resetPassword: (
      data: {
        code: string;
        new_password: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
        },
        void
      >({
        path: `/api/account/resetPassword`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name UserListGames
     * @summary List games
     * @request GET:/api/game/list
     */
    userListGames: (params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: UserGameSimpleInfo[];
        },
        void | ErrorMessage
      >({
        path: `/api/game/list`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Get a game info with team info
     *
     * @tags user
     * @name UserGetGameInfoWithTeamInfo
     * @summary Get a game info with team info
     * @request GET:/api/game/{game_id}
     */
    userGetGameInfoWithTeamInfo: (gameId: number, params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: UserFullGameInfo;
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Get game challenges
     *
     * @tags user
     * @name UserGetGameChallenges
     * @summary Get game challenges
     * @request GET:/api/game/{game_id}/challenges
     */
    userGetGameChallenges: (gameId: number, params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: {
            challenges: UserSimpleGameChallenge[];
            solved_challenges: UserSimpleGameSolvedChallenge[];
          };
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}/challenges`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Get a game challenge
     *
     * @tags user
     * @name UserGetGameChallenge
     * @summary Get a game challenge
     * @request GET:/api/game/{game_id}/challenge/{challenge_id}
     */
    userGetGameChallenge: (
      gameId: number,
      challengeId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: UserDetailGameChallenge;
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}/challenge/${challengeId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Get game notices
     *
     * @tags user
     * @name UserGetGameNotices
     * @summary Get game notices
     * @request GET:/api/game/{game_id}/notices
     */
    userGetGameNotices: (gameId: number, params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: GameNotice[];
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}/notices`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Create a team for a game
     *
     * @tags user
     * @name UserGameCreateTeam
     * @summary Create a team for a game
     * @request POST:/api/game/{game_id}/createTeam
     */
    userGameCreateTeam: (
      gameId: number,
      data: CreateGameTeamPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: GameNotice[];
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}/createTeam`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Submit a flag
     *
     * @tags user
     * @name UserGameSubmitFlag
     * @summary Submit a flag
     * @request POST:/api/game/{game_id}/flag/{challenge_id}
     */
    userGameSubmitFlag: (
      gameId: number,
      challengeId: number,
      data: {
        flag: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: {
            judge_id: string;
          };
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}/flag/${challengeId}`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get a judge result
     *
     * @tags user
     * @name UserGameJudgeResult
     * @summary Get a judge result
     * @request GET:/api/game/{game_id}/flag/{judge_id}
     */
    userGameJudgeResult: (
      gameId: number,
      judgeId: string,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: {
            judge_id: string;
            judge_status:
              | "JudgeQueueing"
              | "JudgeRunning"
              | "JudgeError"
              | "JudgeWA"
              | "JudgeAC"
              | "JudgeTimeout";
          };
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}/flag/${judgeId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Create a container for a challenge
     *
     * @tags user
     * @name UserCreateContainerForAChallenge
     * @summary Create a container for a challenge
     * @request POST:/api/game/{game_id}/container/{challenge_id}
     */
    userCreateContainerForAChallenge: (
      gameId: number,
      challengeId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, void | ErrorMessage>({
        path: `/api/game/${gameId}/container/${challengeId}`,
        method: "POST",
        ...params,
      }),

    /**
     * @description Delete a container for a challenge
     *
     * @tags user
     * @name UserDeleteContainerForAChallenge
     * @summary Delete a container for a challenge
     * @request DELETE:/api/game/{game_id}/container/{challenge_id}
     */
    userDeleteContainerForAChallenge: (
      gameId: number,
      challengeId: number,
      params: RequestParams = {},
    ) =>
      this.request<void, void | ErrorMessage>({
        path: `/api/game/${gameId}/container/${challengeId}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * @description Extend a container's life for a challenge
     *
     * @tags user
     * @name UserExtendContainerLifeForAChallenge
     * @summary Extend a container's life for a challenge
     * @request PATCH:/api/game/{game_id}/container/{challenge_id}
     */
    userExtendContainerLifeForAChallenge: (
      gameId: number,
      challengeId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code?: number;
          data?: {
            /** @format date-time */
            new_expire_time: string;
          };
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}/container/${challengeId}`,
        method: "PATCH",
        format: "json",
        ...params,
      }),

    /**
     * @description Get container info for a challenge
     *
     * @tags user
     * @name UserGetContainerInfoForAChallenge
     * @summary Get container info for a challenge
     * @request GET:/api/game/{game_id}/container/{challenge_id}
     */
    userGetContainerInfoForAChallenge: (
      gameId: number,
      challengeId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: {
            /**
             * Possible statuses of a container:
             * - `ContainerStopped`: The container is stopped.
             * - `ContainerRunning`: The container is running.
             * - `ContainerStarting`: The container is starting.
             * - `ContainerError`: The container encountered an error.
             * - `ContainerStopping`: The container is stopping.
             * - `ContainerQueueing`: The container is in a queue.
             * - `NoContainer`: No container exists.
             */
            container_status: ContainerStatus;
            /** @format date-time */
            container_expiretime?: string;
            containers: ExposePortInfo[];
          };
        },
        void | ErrorMessage
      >({
        path: `/api/game/${gameId}/container/${challengeId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name UserGetGameScoreboard
     * @summary Get game scoreboard data
     * @request GET:/api/game/{game_id}/scoreboard
     */
    userGetGameScoreboard: (
      gameId: number,
      query?: {
        /** 分组ID，如果不传则显示所有队伍 */
        group_id?: number;
        /**
         * 页码，从1开始
         * @default 1
         */
        page?: number;
        /**
         * 每页大小
         * @default 20
         */
        size?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<GameScoreboardResponse, any>({
        path: `/api/game/${gameId}/scoreboard`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description 上传用户头像图片并更新用户资料
     *
     * @tags user
     * @name UploadUserAvatar
     * @summary 上传用户头像
     * @request POST:/api/user/avatar/upload
     */
    uploadUserAvatar: (
      data: {
        /**
         * 要上传的头像图片文件，支持jpg、png、gif等常见图片格式
         * @format binary
         */
        avatar: File;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "头像上传成功" */
          message: string;
          /** 头像访问URL */
          avatar_url: string;
        },
        ErrorMessage | void
      >({
        path: `/api/user/avatar/upload`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name UserGetGroupInviteCodeDetail
     * @summary get the invite code detail of a group
     * @request POST:/api/game/{game_id}/group/invite-code
     */
    userGetGroupInviteCodeDetail: (
      gameId: number,
      data: {
        invite_code: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: {
            group_name: string;
            group_id: number;
          };
        },
        any
      >({
        path: `/api/game/${gameId}/group/invite-code`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags user
     * @name UserGetGameGroups
     * @summary 获取比赛分组列表（用户）
     * @request GET:/api/game/{game_id}/groups
     */
    userGetGameGroups: (gameId: number, params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: GameGroup[];
        },
        any
      >({
        path: `/api/game/${gameId}/groups`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  admin = {
    /**
     * @description Create a new challenge with attachments, container configurations and judge configuration.
     *
     * @tags admin
     * @name CreateChallenge
     * @summary Create a new challenge
     * @request POST:/api/admin/challenge/create
     */
    createChallenge: (data: AdminChallengeConfig, params: RequestParams = {}) =>
      this.request<
        {
          challenge_id?: number;
          /** @format date-time */
          create_at?: string;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/challenge/create`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name GetChallengeInfo
     * @summary Get challenge info
     * @request GET:/api/admin/challenge/{challenge_id}
     */
    getChallengeInfo: (challengeId: number, params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: AdminChallengeConfig;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/challenge/${challengeId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name DeleteChallenge
     * @summary Delete a exist challenge
     * @request DELETE:/api/admin/challenge/{challenge_id}
     */
    deleteChallenge: (challengeId: number, params: RequestParams = {}) =>
      this.request<
        {
          code?: number;
          message?: string;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/challenge/${challengeId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name UpdateChallenge
     * @summary Update a exist challenge
     * @request PUT:/api/admin/challenge/{challenge_id}
     */
    updateChallenge: (
      challengeId: number,
      data: AdminChallengeConfig,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code?: number;
          message?: string;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/challenge/${challengeId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name ListChallenge
     * @summary List challenges
     * @request POST:/api/admin/challenge/list
     */
    listChallenge: (
      data: {
        size: number;
        offset: number;
        category?: ChallengeCategory;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: AdminChallengeSimpleInfo[];
        },
        void | ErrorMessage
      >({
        path: `/api/admin/challenge/list`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name SearchChallenges
     * @summary Search a challenge
     * @request POST:/api/admin/challenge/search
     */
    searchChallenges: (
      data: {
        keyword: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: {
            challenge_id: number;
            name: string;
            category: ChallengeCategory;
            /** @format date-time */
            create_time: string;
          }[];
        },
        void | ErrorMessage
      >({
        path: `/api/admin/challenge/search`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name ListGames
     * @summary List games
     * @request POST:/api/admin/game/list
     */
    listGames: (
      data: {
        size: number;
        offset?: number;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: UserGameSimpleInfo[];
        },
        void | ErrorMessage
      >({
        path: `/api/admin/game/list`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a new game.
     *
     * @tags admin
     * @name CreateGame
     * @summary Create a new game
     * @request POST:/api/admin/game/create
     */
    createGame: (data: AdminFullGameInfo, params: RequestParams = {}) =>
      this.request<
        {
          game_id?: number;
          /** @format date-time */
          create_at?: string;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/game/create`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get a game info
     *
     * @tags admin
     * @name GetGameInfo
     * @summary Get a game info
     * @request GET:/api/admin/game/{game_id}
     */
    getGameInfo: (gameId: number, params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: AdminFullGameInfo;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/game/${gameId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Update a game
     *
     * @tags admin
     * @name UpdateGame
     * @summary Update a game
     * @request PUT:/api/admin/game/{game_id}
     */
    updateGame: (
      gameId: number,
      data: AdminFullGameInfo,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: string;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/game/${gameId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get a gamechallenge from a game
     *
     * @tags admin
     * @name GetGameChallenge
     * @summary Get a gamechallenge from a game
     * @request GET:/api/admin/game/{game_id}/challenge/{challenge_id}
     */
    getGameChallenge: (
      gameId: number,
      challengeId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: AdminDetailGameChallenge;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/game/${gameId}/challenge/${challengeId}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a gamechallenge from a game
     *
     * @tags admin
     * @name DeleteGameChallenge
     * @summary Delete a gamechallenge from a game
     * @request DELETE:/api/admin/game/{game_id}/challenge/{challenge_id}
     */
    deleteGameChallenge: (
      gameId: number,
      challengeId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/game/${gameId}/challenge/${challengeId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description Add a challenge to a game
     *
     * @tags admin
     * @name AddGameChallenge
     * @summary Add a challenge to a game
     * @request POST:/api/admin/game/{game_id}/challenge/{challenge_id}
     */
    addGameChallenge: (
      gameId: number,
      challengeId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: AdminDetailGameChallenge;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/game/${gameId}/challenge/${challengeId}`,
        method: "POST",
        format: "json",
        ...params,
      }),

    /**
     * @description Update a game challenge
     *
     * @tags admin
     * @name UpdateGameChallenge
     * @summary Update a game challenge
     * @request PUT:/api/admin/game/{game_id}/challenge/{challenge_id}
     */
    updateGameChallenge: (
      gameId: number,
      challengeId: number,
      data: AdminDetailGameChallenge,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/game/${gameId}/challenge/${challengeId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get all score adjustments for a specific game
     *
     * @tags admin
     * @name GetGameScoreAdjustments
     * @summary Get game score adjustments
     * @request GET:/api/admin/game/{game_id}/score-adjustments
     */
    getGameScoreAdjustments: (gameId: number, params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: ScoreAdjustmentInfo[];
        },
        void
      >({
        path: `/api/admin/game/${gameId}/score-adjustments`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * @description Create a new score adjustment for a team in the game
     *
     * @tags admin
     * @name CreateScoreAdjustment
     * @summary Create score adjustment
     * @request POST:/api/admin/game/{game_id}/score-adjustments
     */
    createScoreAdjustment: (
      gameId: number,
      data: CreateScoreAdjustmentPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: ScoreAdjustmentInfo;
        },
        void
      >({
        path: `/api/admin/game/${gameId}/score-adjustments`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Update an existing score adjustment
     *
     * @tags admin
     * @name UpdateScoreAdjustment
     * @summary Update score adjustment
     * @request PUT:/api/admin/game/{game_id}/score-adjustments/{adjustment_id}
     */
    updateScoreAdjustment: (
      gameId: number,
      adjustmentId: number,
      data: UpdateScoreAdjustmentPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: ScoreAdjustmentInfo;
        },
        void
      >({
        path: `/api/admin/game/${gameId}/score-adjustments/${adjustmentId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a score adjustment
     *
     * @tags admin
     * @name DeleteScoreAdjustment
     * @summary Delete score adjustment
     * @request DELETE:/api/admin/game/{game_id}/score-adjustments/{adjustment_id}
     */
    deleteScoreAdjustment: (
      gameId: number,
      adjustmentId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          message: string;
        },
        void
      >({
        path: `/api/admin/game/${gameId}/score-adjustments/${adjustmentId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description Delete solve records for a challenge (all or specific team)
     *
     * @tags admin
     * @name DeleteChallengeSolves
     * @summary Delete challenge solve records
     * @request POST:/api/admin/game/{game_id}/challenge/{challenge_id}/solves/delete
     */
    deleteChallengeSolves: (
      gameId: number,
      challengeId: number,
      data: DeleteChallengeSolvesPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          message: string;
          data: {
            deleted_count?: number;
            team_name?: string;
          };
        },
        void
      >({
        path: `/api/admin/game/${gameId}/challenge/${challengeId}/solves/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 上传比赛海报图片并更新比赛信息，需要管理员权限
     *
     * @tags admin
     * @name UploadGamePoster
     * @summary 上传比赛海报
     * @request POST:/api/admin/game/{game_id}/poster/upload
     */
    uploadGamePoster: (
      gameId: number,
      data: {
        /**
         * 要上传的比赛海报图片文件，支持jpg、png、gif等常见图片格式
         * @format binary
         */
        poster: File;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "比赛海报上传成功" */
          message: string;
          /** 海报访问URL */
          poster_url: string;
        },
        ErrorMessage | void
      >({
        path: `/api/admin/game/${gameId}/poster/upload`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name ListUsers
     * @summary List users
     * @request POST:/api/admin/user/list
     */
    listUsers: (
      data: {
        size?: number;
        offset?: number;
        /** 搜索关键词，用于过滤用户名、邮箱、真实姓名或学号 */
        search?: string;
        required?: any;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: AdminListUserItem[];
          total?: number;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/user/list`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员更新用户的基本信息
     *
     * @tags admin
     * @name AdminUpdateUser
     * @summary 更新用户信息
     * @request POST:/api/admin/user/update
     */
    adminUpdateUser: (
      data: AdminUpdateUserPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "用户信息已更新" */
          message: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/user/update`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员重置用户的密码
     *
     * @tags admin
     * @name AdminResetUserPassword
     * @summary 重置用户密码
     * @request POST:/api/admin/user/reset-password
     */
    adminResetUserPassword: (
      data: AdminUserOperationPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "密码已重置" */
          message: string;
          /**
           * 新生成的随机密码
           * @example "Abcd1234"
           */
          new_password: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/user/reset-password`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员删除用户账号
     *
     * @tags admin
     * @name AdminDeleteUser
     * @summary 删除用户
     * @request POST:/api/admin/user/delete
     */
    adminDeleteUser: (
      data: AdminTeamOperationPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "用户已删除" */
          message: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/user/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员根据游戏ID获取参与该游戏的队伍列表，支持分页
     *
     * @tags admin
     * @name AdminListTeams
     * @summary 管理员获取队伍列表
     * @request POST:/api/admin/team/list
     */
    adminListTeams: (data: AdminListTeamsPayload, params: RequestParams = {}) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          data: AdminListTeamItem[];
          /** 总队伍数量 */
          total: number;
        },
        ErrorMessage
      >({
        path: `/api/admin/team/list`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 将队伍状态设置为已批准(Approved)
     *
     * @tags admin
     * @name AdminApproveTeam
     * @summary 批准队伍
     * @request POST:/api/admin/team/approve
     */
    adminApproveTeam: (
      data: AdminTeamOperationPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "队伍已批准" */
          message: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/team/approve`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 将队伍状态设置为已禁赛(Banned)
     *
     * @tags admin
     * @name AdminBanTeam
     * @summary 锁定队伍
     * @request POST:/api/admin/team/ban
     */
    adminBanTeam: (
      data: AdminTeamOperationPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "队伍已锁定" */
          message: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/team/ban`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 将队伍从禁赛状态(Banned)恢复为已批准状态(Approved)
     *
     * @tags admin
     * @name AdminUnbanTeam
     * @summary 解锁队伍
     * @request POST:/api/admin/team/unban
     */
    adminUnbanTeam: (
      data: AdminTeamOperationPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "队伍已解锁" */
          message: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/team/unban`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 从系统中删除队伍
     *
     * @tags admin
     * @name AdminDeleteTeam
     * @summary 删除队伍
     * @request POST:/api/admin/team/delete
     */
    adminDeleteTeam: (
      data: AdminTeamOperationPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "队伍已删除" */
          message: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/team/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员获取所有容器的列表
     *
     * @tags admin
     * @name AdminListContainers
     * @summary 获取容器列表
     * @request POST:/api/admin/container/list
     */
    adminListContainers: (
      data: AdminListContainersPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          data: AdminContainerItem[];
          /** 总容器数量 */
          total: number;
        },
        ErrorMessage
      >({
        path: `/api/admin/container/list`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员删除指定的容器
     *
     * @tags admin
     * @name AdminDeleteContainer
     * @summary 删除容器
     * @request POST:/api/admin/container/delete
     */
    adminDeleteContainer: (
      data: AdminContainerOperationPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "容器已删除" */
          message: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/container/delete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员延长指定容器的生命周期
     *
     * @tags admin
     * @name AdminExtendContainer
     * @summary 延长容器周期
     * @request POST:/api/admin/container/extend
     */
    adminExtendContainer: (
      data: AdminExtendContainerPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "容器生命周期已延长" */
          message: string;
          /**
           * 新的过期时间
           * @format date-time
           */
          new_expire_time: string;
        },
        ErrorMessage
      >({
        path: `/api/admin/container/extend`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员获取指定容器的Flag
     *
     * @tags admin
     * @name AdminGetContainerFlag
     * @summary 获取容器Flag
     * @request GET:/api/admin/container/flag
     */
    adminGetContainerFlag: (
      query: {
        /** 容器ID */
        container_id: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          data: {
            /** 容器Flag内容 */
            flag_content: string;
          };
        },
        ErrorMessage
      >({
        path: `/api/admin/container/flag`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name AdminGetGameGroups
     * @summary 获取比赛分组列表
     * @request GET:/api/admin/game/{game_id}/groups
     */
    adminGetGameGroups: (gameId: number, params: RequestParams = {}) =>
      this.request<
        {
          code: number;
          data: AdminGameGroupItem[];
        },
        any
      >({
        path: `/api/admin/game/${gameId}/groups`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name AdminCreateGameGroup
     * @summary 创建比赛分组
     * @request POST:/api/admin/game/{game_id}/groups
     */
    adminCreateGameGroup: (
      gameId: number,
      data: CreateGameGroupPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: GameGroup;
        },
        any
      >({
        path: `/api/admin/game/${gameId}/groups`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name AdminUpdateGameGroup
     * @summary 更新比赛分组
     * @request PUT:/api/admin/game/{game_id}/groups/{group_id}
     */
    adminUpdateGameGroup: (
      gameId: number,
      groupId: number,
      data: UpdateGameGroupPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          message: string;
        },
        any
      >({
        path: `/api/admin/game/${gameId}/groups/${groupId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name AdminDeleteGameGroup
     * @summary 删除比赛分组
     * @request DELETE:/api/admin/game/{game_id}/groups/{group_id}
     */
    adminDeleteGameGroup: (
      gameId: number,
      groupId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          message: string;
        },
        any
      >({
        path: `/api/admin/game/${gameId}/groups/${groupId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name AdminCreateGameNotice
     * @summary 创建比赛公告
     * @request POST:/api/admin/game/{game_id}/notices
     */
    adminCreateGameNotice: (
      gameId: number,
      data: AdminCreateNoticePayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          message: string;
        },
        void
      >({
        path: `/api/admin/game/${gameId}/notices`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name AdminListGameNotices
     * @summary 获取比赛公告列表
     * @request POST:/api/admin/game/{game_id}/notices/list
     */
    adminListGameNotices: (
      gameId: number,
      data: AdminListNoticesPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: AdminNoticeItem[];
          total: number;
        },
        void
      >({
        path: `/api/admin/game/${gameId}/notices/list`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员获取系统操作日志，支持分页和筛选
     *
     * @tags admin
     * @name AdminGetSystemLogs
     * @summary 获取系统日志
     * @request GET:/api/admin/system/logs
     */
    adminGetSystemLogs: (
      query?: {
        /**
         * 偏移量
         * @default 0
         */
        offset?: number;
        /**
         * 每页大小
         * @max 100
         * @default 20
         */
        size?: number;
        /** 日志类别 */
        category?: LogCategory;
        /** 用户ID */
        user_id?: string;
        /** 资源类型 */
        resource_type?: string;
        /** 状态 */
        status?: "SUCCESS" | "FAILED" | "WARNING";
        /** IP地址 */
        ip_address?: string;
        /** 游戏ID */
        game_id?: number;
        /** 关键词搜索 */
        keyword?: string;
        /**
         * 开始时间
         * @format date-time
         */
        start_time?: string;
        /**
         * 结束时间
         * @format date-time
         */
        end_time?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          data: {
            logs: SystemLogItem[];
            /** 总记录数 */
            total: number;
            pagination: {
              offset: number;
              size: number;
              total: number;
            };
          };
        },
        ErrorMessage | void
      >({
        path: `/api/admin/system/logs`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * @description 管理员获取系统日志统计信息（最近24小时）
     *
     * @tags admin
     * @name AdminGetSystemLogStats
     * @summary 获取系统日志统计
     * @request GET:/api/admin/system/logs/stats
     */
    adminGetSystemLogStats: (params: RequestParams = {}) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          data: SystemLogStats;
        },
        void | ErrorMessage
      >({
        path: `/api/admin/system/logs/stats`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags admin
     * @name AdminDeleteGameNotice
     * @summary 删除比赛公告
     * @request DELETE:/api/admin/game/notices
     */
    adminDeleteGameNotice: (
      data: AdminDeleteNoticePayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          message: string;
        },
        void
      >({
        path: `/api/admin/game/notices`,
        method: "DELETE",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 获取指定比赛的所有提交记录（包含正确和错误），支持分页
     *
     * @tags admin
     * @name AdminListGameSubmits
     * @summary 获取比赛提交记录列表
     * @request POST:/api/admin/game/{game_id}/submits
     */
    adminListGameSubmits: (
      gameId: number,
      data: AdminListSubmitsPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: AdminSubmitItem[];
          total: number;
        },
        void
      >({
        path: `/api/admin/game/${gameId}/submits`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 获取指定比赛的所有作弊记录，支持分页
     *
     * @tags admin
     * @name AdminListGameCheats
     * @summary 获取比赛作弊记录列表
     * @request POST:/api/admin/game/{game_id}/cheats
     */
    adminListGameCheats: (
      gameId: number,
      data: AdminListCheatsPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          code: number;
          data: AdminCheatItem[];
          total: number;
        },
        void
      >({
        path: `/api/admin/game/${gameId}/cheats`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  file = {
    /**
     * @description 上传文件并存储到服务器，返回文件ID
     *
     * @tags file
     * @name UploadFile
     * @summary 上传文件
     * @request POST:/api/file/upload
     */
    uploadFile: (
      data: {
        /**
         * 要上传的文件
         * @format binary
         */
        file: File;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /**
           * 上传文件的唯一标识符
           * @format uuid
           */
          file_id: string;
        },
        ErrorMessage | void
      >({
        path: `/api/file/upload`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * @description 根据文件ID下载之前上传的文件
     *
     * @tags file
     * @name DownloadFile
     * @summary 下载文件
     * @request GET:/api/file/download/{file_id}
     */
    downloadFile: (fileId: string, params: RequestParams = {}) =>
      this.request<File, ErrorMessage>({
        path: `/api/file/download/${fileId}`,
        method: "GET",
        ...params,
      }),
  };
  system = {
    /**
     * @description Send a test mail to a email address
     *
     * @tags system
     * @name SendSmtpTestMail
     * @summary Send a test mail to a email address
     * @request POST:/api/admin/system/test-smtp
     */
    sendSmtpTestMail: (
      data: {
        /** 接收邮件的邮箱地址 */
        to: string;
        /** 接收邮件的邮箱地址 */
        type: "forget" | "verify" | "test";
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
        },
        ErrorMessage | void
      >({
        path: `/api/admin/system/test-smtp`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 上传系统文件并存储到服务器，返回文件ID
     *
     * @tags system
     * @name UploadSystemFile
     * @summary 上传系统文件
     * @request POST:/api/admin/system/upload
     */
    uploadSystemFile: (
      data: {
        /**
         * 要上传的文件
         * @format binary
         */
        file: File;
        /**
         * 资源类型:
         * - svgIconLight: SVG图标(浅色)
         * - svgIconDark: SVG图标(深色)
         * - trophysGold: 金牌奖杯
         * - trophysSilver: 银牌奖杯
         * - trophysBronze: 铜牌奖杯
         * - schoolLogo: 学校Logo
         * - schoolSmallIcon: 学校小图标
         * - fancyBackGroundIconWhite: 白色背景图标
         * - fancyBackGroundIconBlack: 黑色背景图标
         * - gameIconLight: 比赛图标(浅色)
         * - gameIconDark: 比赛图标(深色)
         */
        resource_type: SystemResourceType;
        data?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          data: {
            /** 文件URL */
            file_id?: string;
          };
        },
        ErrorMessage | void
      >({
        path: `/api/admin/system/upload`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * @description 获取当前系统的所有配置设置
     *
     * @tags system
     * @name GetSystemSettings
     * @summary 获取系统设置
     * @request GET:/api/admin/system/settings
     */
    getSystemSettings: (params: RequestParams = {}) =>
      this.request<
        {
          /** @example 200 */
          code?: number;
          /** 系统设置完整结构体 */
          data?: SystemSettings;
        },
        Error
      >({
        path: `/api/admin/system/settings`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags system
     * @name UpdateSystemSettings
     * @summary 更新系统设置
     * @request POST:/api/admin/system/settings
     */
    updateSystemSettings: (
      data: SystemSettingsPartialUpdate,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code?: number;
          /** @example "System settings updated" */
          message?: string;
          /** 系统设置完整结构体 */
          data?: SystemSettings;
        },
        Error
      >({
        path: `/api/admin/system/settings`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  team = {
    /**
     * @description 上传团队头像图片并更新团队资料，需要团队成员权限
     *
     * @tags team
     * @name UploadTeamAvatar
     * @summary 上传团队头像
     * @request POST:/api/game/{game_id}/team/avatar/upload
     */
    uploadTeamAvatar: (
      gameId: number,
      data: {
        /**
         * 要上传的团队头像图片文件，支持jpg、png、gif等常见图片格式
         * @format binary
         */
        avatar: File;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "团队头像上传成功" */
          message: string;
          /** 团队头像访问URL */
          avatar_url: string;
        },
        ErrorMessage | void
      >({
        path: `/api/game/${gameId}/team/avatar/upload`,
        method: "POST",
        body: data,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),

    /**
     * @description 使用邀请码申请加入战队
     *
     * @tags team
     * @name TeamAccept
     * @summary 申请加入战队
     * @request POST:/api/game/{game_id}/team/join
     */
    teamAccept: (
      gameId: number,
      data: TeamJoinPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "申请已提交，等待队长审核" */
          message: string;
        },
        ErrorMessage | void
      >({
        path: `/api/game/${gameId}/team/join`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 队长将队长权限转移给其他成员
     *
     * @tags team
     * @name TransferTeamCaptain
     * @summary 转移队长
     * @request POST:/api/game/{game_id}/team/{team_id}/transfer-captain
     */
    transferTeamCaptain: (
      teamId: number,
      gameId: number,
      data: TransferCaptainPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "队长已转移" */
          message: string;
        },
        ErrorMessage | void
      >({
        path: `/api/game/${gameId}/team/${teamId}/transfer-captain`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description 队长踢出战队成员
     *
     * @tags team
     * @name RemoveTeamMember
     * @summary 踢出队员
     * @request DELETE:/api/game/{game_id}/team/{team_id}/member/{user_id}
     */
    removeTeamMember: (
      teamId: number,
      userId: string,
      gameId: number,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "队员已移除" */
          message: string;
        },
        ErrorMessage | void
      >({
        path: `/api/game/${gameId}/team/${teamId}/member/${userId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description 队长解散战队
     *
     * @tags team
     * @name DeleteTeam
     * @summary 解散战队
     * @request DELETE:/api/game/{game_id}/team/{team_id}
     */
    deleteTeam: (teamId: number, gameId: number, params: RequestParams = {}) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "战队已解散" */
          message: string;
        },
        ErrorMessage | void
      >({
        path: `/api/game/${gameId}/team/${teamId}`,
        method: "DELETE",
        format: "json",
        ...params,
      }),

    /**
     * @description 队长更新战队信息（只能修改口号）
     *
     * @tags team
     * @name UpdateTeamInfo
     * @summary 更新战队信息
     * @request PUT:/api/game/{game_id}/team/{team_id}
     */
    updateTeamInfo: (
      teamId: number,
      gameId: number,
      data: UpdateTeamInfoPayload,
      params: RequestParams = {},
    ) =>
      this.request<
        {
          /** @example 200 */
          code: number;
          /** @example "战队信息已更新" */
          message: string;
        },
        ErrorMessage | void
      >({
        path: `/api/game/${gameId}/team/${teamId}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
}
