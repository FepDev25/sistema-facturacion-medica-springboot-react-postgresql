package com.fepdev.sfm.backend.config;

import java.time.Duration;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

@Configuration
@EnableCaching
public class CacheConfig {

    // Configura un RedisCacheManager con TTL específicos para cada cache y serializers adecuados
    private GenericJacksonJsonRedisSerializer buildJsonSerializer() {
        var validator = BasicPolymorphicTypeValidator.builder()
                .allowIfBaseType(Object.class) // equivalente a LaissezFaireSubTypeValidator
                .build();

        return GenericJacksonJsonRedisSerializer.create(builder -> builder
                .enableDefaultTyping(validator)
        );
    }

    @SuppressWarnings("unused")
    @Bean
    RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
                .serializeKeysWith(SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(SerializationPair.fromSerializer(buildJsonSerializer()))
                .disableCachingNullValues();

        return RedisCacheManager.builder(connectionFactory)
                .withCacheConfiguration("services",
                        base.entryTtl(Duration.ofHours(2)))
                .withCacheConfiguration("services-list",
                        base.entryTtl(Duration.ofHours(2)))
                .withCacheConfiguration("medications",
                        base.entryTtl(Duration.ofHours(2)))
                .withCacheConfiguration("medications-list",
                        base.entryTtl(Duration.ofHours(2)))
                .withCacheConfiguration("insurance-providers",
                        base.entryTtl(Duration.ofHours(1)))
                .build();
    }
}
