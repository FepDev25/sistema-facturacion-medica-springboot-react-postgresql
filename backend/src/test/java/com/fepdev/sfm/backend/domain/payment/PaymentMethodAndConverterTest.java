package com.fepdev.sfm.backend.domain.payment;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PaymentMethodAndConverterTest {

    private final PaymentMethodConverter converter = new PaymentMethodConverter();

    @Test
    void paymentMethod_jsonAndConverter_coverBranches() {
        assertThat(PaymentMethod.BANK_TRANSFER.toValue()).isEqualTo("bank_transfer");
        assertThat(PaymentMethod.fromJson("credit_card")).isEqualTo(PaymentMethod.CREDIT_CARD);
        assertThat(PaymentMethod.fromJson(null)).isNull();

        assertThat(converter.convertToDatabaseColumn(PaymentMethod.CASH)).isEqualTo("cash");
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute("other")).isEqualTo(PaymentMethod.OTHER);
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }
}
