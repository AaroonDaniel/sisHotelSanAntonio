<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    /**
     * Muestra la bitácora de auditoría del sistema.
     */
    public function index(Request $request): Response
    {
        $logs = Activity::query()
            ->with('causer')
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Activity $activity) => [
                'id'           => $activity->id,
                'description'  => $activity->description, // created | updated | deleted
                'log_name'     => $activity->log_name,
                'subject_type' => class_basename($activity->subject_type ?? ''),
                'subject_id'   => $activity->subject_id,
                'event'        => $activity->event,
                'causer'       => $activity->causer
                    // 👇 Aquí está la corrección: usamos full_name o nickname
                    ? ['id' => $activity->causer->id, 'name' => $activity->causer->full_name ?? $activity->causer->nickname ?? 'Usuario']
                    : null,
                'ip'           => $activity->properties['ip'] ?? null,
                'role'         => $activity->properties['role'] ?? null,
                'properties'   => [
                    'old'        => $activity->properties['old'] ?? null,
                    'attributes' => $activity->properties['attributes'] ?? null,
                ],
                'created_at'   => $activity->created_at?->toIso8601String(),
            ]);

        return Inertia::render('activity-logs/index', [
            'logs' => $logs,
        ]);
    }
}