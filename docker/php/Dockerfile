FROM php:8.2-fpm-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    git unzip \
    libxml2-dev \
    libzip-dev libicu-dev libonig-dev \
    libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    libpq-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
    pdo_mysql pdo_pgsql \
    bcmath \
    soap \
    gd \
    zip intl exif pcntl opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-hotel.ini

WORKDIR /var/www/html