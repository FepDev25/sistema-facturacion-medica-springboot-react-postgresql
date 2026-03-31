package com.fepdev.sfm.backend.config;

import java.io.IOException;
import java.time.Duration;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
@EnableCaching
public class CacheConfig {

    // ObjectMapper independiente del principal: DefaultTyping solo aplica a Redis,
    // no afecta la serializacion de la API REST.
    private RedisSerializer<Object> buildJsonSerializer() {
        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .activateDefaultTyping(
                        LaissezFaireSubTypeValidator.instance,
                        ObjectMapper.DefaultTyping.NON_FINAL,
                        JsonTypeInfo.As.PROPERTY);

        return new RedisSerializer<>() {
            @Override
            public byte[] serialize(Object value) throws SerializationException {
                if (value == null) return null;
                try {
                    return mapper.writeValueAsBytes(value);
                } catch (IOException e) {
                    throw new SerializationException("No se pudo serializar el objeto para Redis", e);
                }
            }

            @Override
            public Object deserialize(byte[] bytes) throws SerializationException {
                if (bytes == null || bytes.length == 0) return null;
                try {
                    return mapper.readValue(bytes, Object.class);
                } catch (IOException e) {
                    throw new SerializationException("No se pudo deserializar el valor de Redis", e);
                }
            }
        };
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
