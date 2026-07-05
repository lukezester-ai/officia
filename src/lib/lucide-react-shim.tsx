import { SVGProps, ReactElement } from 'react';

export interface LucideProps extends SVGProps<SVGSVGElement> {
  size?: string | number;
  strokeWidth?: string | number;
  absoluteStrokeWidth?: boolean;
}

export type LucideIcon = (props: LucideProps) => ReactElement;

function makeIcon(label: string): LucideIcon {
  return function Icon({ size = 24, strokeWidth = 2, className, ...props }: LucideProps) {
    return (
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8" />
        <title>{label}</title>
      </svg>
    );
  };
}

export const AlertCircle = makeIcon('AlertCircle');
export const AlertTriangle = makeIcon('AlertTriangle');
export const ArrowDownRight = makeIcon('ArrowDownRight');
export const ArrowDownToLine = makeIcon('ArrowDownToLine');
export const ArrowLeft = makeIcon('ArrowLeft');
export const ArrowRight = makeIcon('ArrowRight');
export const ArrowUpDown = makeIcon('ArrowUpDown');
export const ArrowUpFromLine = makeIcon('ArrowUpFromLine');
export const ArrowUpRight = makeIcon('ArrowUpRight');
export const BarChart2 = makeIcon('BarChart2');
export const BarChart3 = makeIcon('BarChart3');
export const Bell = makeIcon('Bell');
export const BookOpen = makeIcon('BookOpen');
export const Bookmark = makeIcon('Bookmark');
export const Bot = makeIcon('Bot');
export const Box = makeIcon('Box');
export const Brain = makeIcon('Brain');
export const BrainCircuit = makeIcon('BrainCircuit');
export const Briefcase = makeIcon('Briefcase');
export const Building = makeIcon('Building');
export const Building2 = makeIcon('Building2');
export const Calculator = makeIcon('Calculator');
export const Calendar = makeIcon('Calendar');
export const Check = makeIcon('Check');
export const CheckCircle = makeIcon('CheckCircle');
export const CheckCircle2 = makeIcon('CheckCircle2');
export const CheckCircleIcon = makeIcon('CheckCircleIcon');
export const CheckIcon = makeIcon('CheckIcon');
export const CheckSquare = makeIcon('CheckSquare');
export const ChevronDown = makeIcon('ChevronDown');
export const ChevronLeft = makeIcon('ChevronLeft');
export const ChevronRight = makeIcon('ChevronRight');
export const ChevronRightIcon = makeIcon('ChevronRightIcon');
export const CircleCheckIcon = makeIcon('CircleCheckIcon');
export const Clock = makeIcon('Clock');
export const Copy = makeIcon('Copy');
export const Cpu = makeIcon('Cpu');
export const CreditCard = makeIcon('CreditCard');
export const DollarSign = makeIcon('DollarSign');
export const Download = makeIcon('Download');
export const Edit = makeIcon('Edit');
export const Euro = makeIcon('Euro');
export const Eye = makeIcon('Eye');
export const File = makeIcon('File');
export const FileArchive = makeIcon('FileArchive');
export const FileCheck = makeIcon('FileCheck');
export const FileDigit = makeIcon('FileDigit');
export const FileKey = makeIcon('FileKey');
export const FilePlus = makeIcon('FilePlus');
export const FileSignature = makeIcon('FileSignature');
export const FileSpreadsheet = makeIcon('FileSpreadsheet');
export const FileText = makeIcon('FileText');
export const Filter = makeIcon('Filter');
export const HelpCircle = makeIcon('HelpCircle');
export const History = makeIcon('History');
export const ImagePlus = makeIcon('ImagePlus');
export const Inbox = makeIcon('Inbox');
export const InfoIcon = makeIcon('InfoIcon');
export const Landmark = makeIcon('Landmark');
export const Layers = makeIcon('Layers');
export const LayoutDashboard = makeIcon('LayoutDashboard');
export const LayoutList = makeIcon('LayoutList');
export const Link = makeIcon('Link');
export const Loader2 = makeIcon('Loader2');
export const Loader2Icon = makeIcon('Loader2Icon');
export const LogIn = makeIcon('LogIn');
export const LogOut = makeIcon('LogOut');
export const Mail = makeIcon('Mail');
export const MapPin = makeIcon('MapPin');
export const Maximize2 = makeIcon('Maximize2');
export const Menu = makeIcon('Menu');
export const MessageSquare = makeIcon('MessageSquare');
export const Mic = makeIcon('Mic');
export const MicOff = makeIcon('MicOff');
export const Minimize2 = makeIcon('Minimize2');
export const Minus = makeIcon('Minus');
export const Moon = makeIcon('Moon');
export const OctagonXIcon = makeIcon('OctagonXIcon');
export const Package = makeIcon('Package');
export const PanelLeftIcon = makeIcon('PanelLeftIcon');
export const Paperclip = makeIcon('Paperclip');
export const Pencil = makeIcon('Pencil');
export const Phone = makeIcon('Phone');
export const PieChart = makeIcon('PieChart');
export const Plus = makeIcon('Plus');
export const PoundSterling = makeIcon('PoundSterling');
export const Printer = makeIcon('Printer');
export const Receipt = makeIcon('Receipt');
export const RefreshCw = makeIcon('RefreshCw');
export const Save = makeIcon('Save');
export const Scale = makeIcon('Scale');
export const Scan = makeIcon('Scan');
export const Search = makeIcon('Search');
export const Send = makeIcon('Send');
export const Settings = makeIcon('Settings');
export const Shield = makeIcon('Shield');
export const ShieldCheck = makeIcon('ShieldCheck');
export const ShoppingCart = makeIcon('ShoppingCart');
export const Sparkles = makeIcon('Sparkles');
export const Star = makeIcon('Star');
export const Sun = makeIcon('Sun');
export const Tags = makeIcon('Tags');
export const ThumbsUp = makeIcon('ThumbsUp');
export const Trash2 = makeIcon('Trash2');
export const TrendingDown = makeIcon('TrendingDown');
export const TrendingUp = makeIcon('TrendingUp');
export const TriangleAlertIcon = makeIcon('TriangleAlertIcon');
export const Upload = makeIcon('Upload');
export const UploadCloud = makeIcon('UploadCloud');
export const User = makeIcon('User');
export const UserPlus = makeIcon('UserPlus');
export const Users = makeIcon('Users');
export const UsersRound = makeIcon('UsersRound');
export const UserX = makeIcon('UserX');
export const Wallet = makeIcon('Wallet');
export const Waves = makeIcon('Waves');
export const X = makeIcon('X');
export const XCircle = makeIcon('XCircle');
export const XIcon = makeIcon('XIcon');
export const Zap = makeIcon('Zap');
