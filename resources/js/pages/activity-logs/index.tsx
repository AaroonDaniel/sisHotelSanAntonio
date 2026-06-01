import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Eye, FileClock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

/* ----------------------------- Tipos ----------------------------- */

type ActivityEvent = 'created' | 'updated' | 'deleted' | string;

interface ActivityProperties {
    old: Record<string, unknown> | null;
    attributes: Record<string, unknown> | null;
}

interface ActivityCauser {
    id: number;
    name: string;
}

interface ActivityLog {
    id: number;
    description: ActivityEvent;
    log_name: string | null;
    subject_type: string;
    subject_id: number | null;
    event: ActivityEvent | null;
    causer: ActivityCauser | null;
    ip: string | null;
    role: string | null;
    properties: ActivityProperties;
    created_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedLogs {
    data: ActivityLog[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    auth: {
        user: {
            id: number;
            name: string;
            nickname: string;
            full_name: string;
            [key: string]: any; // Esto permite cualquier otro campo adicional de tu sistema
        };
    };
    logs: PaginatedLogs;
}

/* -------------------------- Utilidades --------------------------- */

const ACTION_LABELS: Record<string, string> = {
    created: 'Creado',
    updated: 'Actualizado',
    deleted: 'Eliminado',
    restored: 'Restaurado',
};

const ACTION_STYLES: Record<string, string> = {
    created: 'bg-green-100 text-green-700 border-green-200',
    updated: 'bg-amber-100 text-amber-700 border-amber-200',
    deleted: 'bg-red-100 text-red-700 border-red-200',
    restored: 'bg-blue-100 text-blue-700 border-blue-200',
};

const MODULE_LABELS: Record<string, string> = {
    usuarios: 'Usuarios',
    checkins: 'Registros (Check-in)',
    pagos: 'Pagos',
    default: 'Sistema',
};

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function actionLabel(event: ActivityEvent): string {
    return ACTION_LABELS[event] ?? event;
}

function moduleLabel(log: ActivityLog): string {
    if (log.log_name && MODULE_LABELS[log.log_name]) {
        return MODULE_LABELS[log.log_name];
    }
    return log.log_name ?? log.subject_type ?? MODULE_LABELS.default;
}

/* ----------------------- Componente principal -------------------- */

export default function ActivityLogIndex({ auth, logs }: Props) {
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Auditoría y Bitácora" />

            <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
                {/* Botón Volver al Dashboard */}
                <button
                    onClick={() => router.visit('/dashboard')}
                    className="group mb-4 flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-600 bg-gray-700 transition group-hover:border-gray-400 group-hover:bg-gray-600">
                        <ArrowLeft className="h-4 w-4" />
                    </div>
                    <span>Volver al Panel de Control</span>
                </button>

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-white">
                        <div className="rounded-xl border border-indigo-100 bg-indigo-100 p-2">
                            <ShieldCheck className="h-8 w-8 text-indigo-600" />
                        </div>
                        Auditoría y Bitácora
                    </h2>
                    <span className="text-sm text-gray-400">
                        {logs.total} registro{logs.total === 1 ? '' : 's'} en
                        total
                    </span>
                </div>

                <Card className="overflow-hidden border border-gray-200 bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50">
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Fecha y Hora
                                </TableHead>
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Usuario
                                </TableHead>
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Rol
                                </TableHead>
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Acción
                                </TableHead>
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    Módulo
                                </TableHead>
                                <TableHead className="text-xs font-bold text-gray-600 uppercase">
                                    IP
                                </TableHead>
                                <TableHead className="text-right text-xs font-bold text-gray-600 uppercase">
                                    Detalles
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {logs.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="py-12 text-center text-sm text-gray-500"
                                    >
                                        <FileClock className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                                        No hay actividad registrada todavía.
                                    </TableCell>
                                </TableRow>
                            )}

                            {logs.data.map((log) => (
                                <TableRow
                                    key={log.id}
                                    className="transition-colors hover:bg-gray-50/60"
                                >
                                    <TableCell className="text-sm font-medium whitespace-nowrap text-gray-800">
                                        {formatDateTime(log.created_at)}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-700">
                                        {log.causer ? (
                                            log.causer.name
                                        ) : (
                                            <span className="text-gray-400 italic">
                                                Sistema
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-700">
                                        {log.role ? (
                                            <Badge
                                                variant="outline"
                                                className="border-gray-200 bg-gray-100 text-gray-700 capitalize"
                                            >
                                                {log.role}
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-400">
                                                —
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={
                                                ACTION_STYLES[
                                                    log.description
                                                ] ??
                                                'border-gray-200 bg-gray-100 text-gray-700'
                                            }
                                        >
                                            {actionLabel(log.description)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-700">
                                        {moduleLabel(log)}
                                        {log.subject_id != null && (
                                            <span className="ml-1 text-xs text-gray-400">
                                                #{log.subject_id}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm text-gray-600">
                                        {log.ip ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-600 hover:text-white"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            Ver cambios
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                {/* Paginación
                    NOTA IMPORTANTE: 'Link' ahora se importa de '@inertiajs/react'
                    (antes estaba importado de 'lucide-react' por error, lo que
                    renderizaba un ICONO en lugar de un enlace y por eso solo
                    se veían los círculos vacíos sin números de página).
                */}
                {logs.links.length > 3 && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
                        {logs.links.map((link, index) => (
                            <Link
                                key={index}
                                href={link.url ?? '#'}
                                preserveScroll
                                preserveState
                                className={`inline-flex min-w-[2.25rem] items-center justify-center rounded-lg px-3 py-1.5 text-sm transition ${
                                    link.active
                                        ? 'bg-indigo-600 font-bold text-white shadow-md hover:bg-indigo-700'
                                        : link.url
                                          ? 'border border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'
                                          : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                                }`}
                            >
                                <span
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <ChangeDetailDialog
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
            />
        </AuthenticatedLayout>
    );
}

/* ----------------------- Modal de detalles ----------------------- */

interface ChangeDetailDialogProps {
    log: ActivityLog | null;
    onClose: () => void;
}

function ChangeDetailDialog({ log, onClose }: ChangeDetailDialogProps) {
    if (!log) return null;

    const { old, attributes } = log.properties;

    return (
        <Dialog open={!!log} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-indigo-600" />
                        Detalle del cambio
                    </DialogTitle>
                    <DialogDescription>
                        {moduleLabel(log)} · {actionLabel(log.description)} ·{' '}
                        {formatDateTime(log.created_at)}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                    <ChangePanel
                        title="Valores anteriores"
                        tone="old"
                        data={old}
                    />
                    <ChangePanel
                        title="Valores nuevos"
                        tone="new"
                        data={attributes}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface ChangePanelProps {
    title: string;
    tone: 'old' | 'new';
    data: Record<string, unknown> | null;
}

function ChangePanel({ title, tone, data }: ChangePanelProps) {
    const accent =
        tone === 'old'
            ? 'border-red-200 bg-red-50'
            : 'border-green-200 bg-green-50';
    const heading = tone === 'old' ? 'text-red-700' : 'text-green-700';

    return (
        <div className={`rounded-xl border p-3 ${accent}`}>
            <h4 className={`mb-2 text-xs font-bold uppercase ${heading}`}>
                {title}
            </h4>
            {data && Object.keys(data).length > 0 ? (
                <pre className="max-h-72 overflow-auto rounded-lg bg-white/70 p-2 text-xs text-gray-800">
                    {JSON.stringify(data, null, 2)}
                </pre>
            ) : (
                <p className="text-xs text-gray-500 italic">Sin datos.</p>
            )}
        </div>
    );
}