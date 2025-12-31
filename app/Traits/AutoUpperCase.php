<?php

namespace App\Traits;

trait AutoUpperCase
{
    /**
     * Este método se ejecuta automáticamente al usar el Trait.
     * Escucha el evento 'saving' (antes de guardar o actualizar).
     */
    protected static function bootAutoUpperCase()
    {
        static::saving(function ($model) {
            // Buscamos si el modelo tiene definida la variable $uppercaseFields
            if (property_exists($model, 'uppercaseFields')) {
                foreach ($model->uppercaseFields as $field) {
                    // Si el campo tiene valor y es un string, lo convertimos
                    if (! empty($model->{$field}) && is_string($model->{$field})) {
                        $model->{$field} = mb_strtoupper($model->{$field}, 'UTF-8');
                    }
                }
            }
        });
    }
}