package com.mfrp.plens.model;

import jakarta.persistence.*;

import lombok.*;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Technology {
    @Column(name = "technology_name", nullable = false, length = 60)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private TechnologyCategory category;
}
